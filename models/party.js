const { BadRequestError, NotFoundError } = require("../utils/errors");

const Parse = require("../utils/initializeParse");
const User = require("./user");

class Party {
  static async handleCreateParty(body) {
    const bodyProps = ["name", "dm", "searchParameters", "mode"];
    bodyProps.forEach((item) => {
      if (!body.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Properties");
      }
    });
    const searchProps = ["experience", "type", "genre", "level"];
    searchProps.forEach((item) => {
      if (!body.searchParameters.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Search Parameters");
      }
    });

    const newParty = new Parse.Object("Party");
    newParty.set("name", body.name);
    let dm;
    try {
      const query = new Parse.Query("User");
      dm = await query.get(body.dm.objectId);
    } catch {
      throw new NotFoundError(`Invalid userId ${body.dm.objectId}`);
    }

    if (!dm.get("enabled")) {
      console.log("disabled user");
      throw new BadRequestError("Attempting to create party for disabled user");
    }
    if (dm.get("numParties") >= 100) {
      throw new BadRequestError(
        "You have reached the maximum limit for parties"
      );
    }
    dm.increment("numParties", 1);
    await dm.save({}, { useMasterKey: true });
    newParty.set("dm", dm);
    newParty.set("searchParameters", body.searchParameters);
    newParty.set("status", body.mode);
    if (body.hasOwnProperty("image")) {
      newParty.set("image", body.image);
    }

    let result = await newParty.save();
    return result.id;
  }

  static async getParty(partyId) {
    const query = new Parse.Query("Party");
    try {
      const party = await query.get(partyId);
      const requestedUsers = await this.getRequestedUsers(partyId);
      const members = await this.getMembers(partyId);

      return { party: party, requestedUsers: requestedUsers, members: members };
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }
  }

  static async getRequestedUsers(partyId) {
    let party;
    try {
      const query = new Parse.Query("Party");
      party = await query.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }
    const users = await party.get("playersRequested").query().find();
    return users;
  }

  static async handleSearchParty(searchParameters, userId, first, last) {
    const pageLimit = 2;
    let user;
    const dmQuery = new Parse.Query("Party");
    const findPlayerParties = new Parse.Query("Party");
    const playerQuery = new Parse.Query("Party");

    if (userId !== undefined) {
      try {
        const userQuery = new Parse.Query("User");
        user = await userQuery.get(userId);
        dmQuery.notEqualTo("dm", {
          __type: "Pointer",
          className: "_User",
          objectId: userId,
        });
        findPlayerParties.equalTo("players", user);
        playerQuery.doesNotMatchKeyInQuery(
          "objectId",
          "objectId",
          findPlayerParties
        );
      } catch {
        throw new NotFoundError(`Invalid userId ${userId}`);
      }
    }

    const experienceQuery = new Parse.Query("Party");
    const typeQuery = new Parse.Query("Party");
    const genreQuery = new Parse.Query("Party");
    const levelQuery = new Parse.Query("Party");
    const statusQuery = new Parse.Query("Party");

    experienceQuery.equalTo(
      "searchParameters.experience",
      searchParameters.experience
    );
    if (searchParameters.hasOwnProperty("type")) {
      typeQuery.equalTo("searchParameters.type", searchParameters.type);
    }
    if (searchParameters.hasOwnProperty("genre")) {
      genreQuery.equalTo("searchParameters.genre", searchParameters.genre);
    }
    if (searchParameters.hasOwnProperty("level")) {
      levelQuery.equalTo("searchParameters.level", searchParameters.level);
    }
    statusQuery.notEqualTo("status", "Closed");

    const reverseTypeQuery = new Parse.Query("Party");
    reverseTypeQuery.doesNotMatchKeyInQuery("objectId", "objectId", typeQuery);
    const reverseGenreQuery = new Parse.Query("Party");
    reverseGenreQuery.doesNotMatchKeyInQuery(
      "objectId",
      "objectId",
      genreQuery
    );
    const reverseLevelQuery = new Parse.Query("Party");
    reverseLevelQuery.doesNotMatchKeyInQuery(
      "objectId",
      "objectId",
      levelQuery
    );

    const firstRequest = async () => {
      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        genreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery
      );
      query.descending("createdAt");
      query.limit(pageLimit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100;
      });
      if (partiesObjects.length <= pageLimit) {
        const restOfParties = await last75(
          null,
          pageLimit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(pageLimit);
      }

      if (first !== null) {
        partiesObjects.reverse();
      }

      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last100 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        genreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last75(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last75 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        genreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 75;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last65(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last65 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        reverseGenreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 65;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last60(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last60 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        genreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 60;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last40(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last40 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        reverseGenreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 40;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last35(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last35 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        genreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 35;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last25(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last25 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        reverseGenreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 25;
      });
      if (partiesObjects.length <= limit) {
        const restOfParties = await last0(null, limit - partiesObjects.length);
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...partiesObjects, ...restOfParties.parties],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const last0 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (lastObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(lastObjectId);
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        reverseGenreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.descending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 0;
      });
      if (partiesObjects.length <= limit) {
        reachedEnd = true;
        return { parties: partiesObjects, reachedEnd: reachedEnd };
      } else {
        partiesObjects.splice(limit);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first100 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        genreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        reachedEnd = true;
        return { parties: partiesObjects, reachedEnd: reachedEnd };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first75 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        genreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 75;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first100(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first65 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        reverseGenreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 65;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first75(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first60 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        genreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 60;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first65(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first40 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        typeQuery,
        reverseGenreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 40;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first60(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first35 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        genreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 35;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first40(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first25 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        reverseGenreQuery,
        levelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 25;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first35(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    const first0 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if (firstObjectId !== null) {
        const getLastQuery = new Parse.Query("Party");
        const lastParty = await getLastQuery.get(firstObjectId);
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"));
      }

      const query = Parse.Query.and(
        experienceQuery,
        reverseTypeQuery,
        reverseGenreQuery,
        reverseLevelQuery,
        statusQuery,
        dmQuery,
        playerQuery,
        pointerQuery
      );
      query.ascending("createdAt");
      query.limit(limit + 1);
      const parties = await query.find();

      const partiesObjects = parties.map((item) => {
        return item.toJSON();
      });

      let reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 0;
      });
      partiesObjects.reverse();
      if (partiesObjects.length <= limit) {
        const restOfParties = await first25(
          null,
          limit - partiesObjects.length
        );
        reachedEnd = restOfParties.reachedEnd;
        return {
          parties: [...restOfParties.parties, ...partiesObjects],
          reachedEnd: reachedEnd,
        };
      } else {
        partiesObjects.splice(0, 1);
      }
      return { parties: partiesObjects, reachedEnd: reachedEnd };
    };

    if (last !== null) {
      if (last.relevance === 100)
        return await last100(last.objectId, pageLimit);
      if (last.relevance === 75) return await last75(last.objectId, pageLimit);
      if (last.relevance === 65) return await last65(last.objectId, pageLimit);
      if (last.relevance === 60) return await last60(last.objectId, pageLimit);
      if (last.relevance === 40) return await last40(last.objectId, pageLimit);
      if (last.relevance === 35) return await last35(last.objectId, pageLimit);
      if (last.relevance === 25) return await last25(last.objectId, pageLimit);
      if (last.relevance === 0) return await last0(last.objectId, pageLimit);
    }
    if (first !== null) {
      if (first.relevance === 100)
        return await first100(first.objectId, pageLimit);
      if (first.relevance === 75)
        return await first75(first.objectId, pageLimit);
      if (first.relevance === 65)
        return await first65(first.objectId, pageLimit);
      if (first.relevance === 60)
        return await first60(first.objectId, pageLimit);
      if (first.relevance === 40)
        return await first40(first.objectId, pageLimit);
      if (first.relevance === 35)
        return await first35(first.objectId, pageLimit);
      if (first.relevance === 25)
        return await first25(first.objectId, pageLimit);
      if (first.relevance === 0) {
        return await first0(first.objectId, pageLimit);
      }
    }
    return await firstRequest();
  }

  static async handleSearchPartyByName(partyName, userId, first, last) {
    const pageLimit = 2;

    const userQuery = new Parse.Query("User");
    const user = await userQuery.get(userId);
    const ascending = first === null;

    const nameQuery = new Parse.Query("Party");
    const statusQuery = new Parse.Query("Party");
    const dmQuery = new Parse.Query("Party");
    const findPlayerParties = new Parse.Query("Party");
    const playerQuery = new Parse.Query("Party");
    const firstQueryLess = new Parse.Query("Party");
    const firstQueryEqual = new Parse.Query("Party");
    const lastQueryGreater = new Parse.Query("Party");
    const lastQueryEqualName = new Parse.Query("Party");
    const lastQueryEqualDate = new Parse.Query("Party");
    let lastQueryEqual = new Parse.Query("Party");

    statusQuery.notEqualTo("status", "Closed");
    dmQuery.notEqualTo("dm", {
      __type: "Pointer",
      className: "_User",
      objectId: userId,
    });
    findPlayerParties.equalTo("players", user);
    playerQuery.doesNotMatchKeyInQuery(
      "objectId",
      "objectId",
      findPlayerParties
    );
    nameQuery.startsWith("name", partyName);

    if (first !== null) {
      firstQueryLess.lessThan("name", first.name);
      firstQueryEqual.equalTo("name", first.name);
      const getFirstQuery = new Parse.Query("Party");
      const firstParty = await getFirstQuery.get(first.objectId);
      firstQueryEqual.greaterThan("createdAt", firstParty.get("createdAt"));
    }
    if (last !== null) {
      lastQueryGreater.greaterThan("name", last.name);
      lastQueryEqualName.equalTo("name", last.name);
      const getLastQuery = new Parse.Query("Party");
      const lastParty = await getLastQuery.get(last.objectId);
      lastQueryEqualDate.lessThan("createdAt", lastParty.get("createdAt"));
      lastQueryEqual = Parse.Query.and(lastQueryEqualName, lastQueryEqualDate);
    }
    const firstQuery = Parse.Query.or(firstQueryLess, firstQueryEqual);
    const lastQuery = Parse.Query.or(lastQueryGreater, lastQueryEqual);

    const query = Parse.Query.and(
      nameQuery,
      statusQuery,
      dmQuery,
      playerQuery,
      firstQuery,
      lastQuery
    );
    query.limit(pageLimit + 1);
    if (ascending) {
      query.ascending("name");
      query.addDescending("createdAt");
    } else {
      query.descending("name");
      query.addAscending("createdAt");
    }
    const parties = await query.find();

    const partiesObjects = parties.map((item) => {
      return item.toJSON();
    });

    let reachedEnd = false;

    if (partiesObjects.length <= pageLimit) {
      reachedEnd = true;
    } else {
      partiesObjects.splice(pageLimit);
    }

    if (first !== null) {
      partiesObjects.reverse();
    }

    return { parties: partiesObjects, reachedEnd: reachedEnd };
  }

  static async getMembers(partyId) {
    const query = new Parse.Query("Party");
    const party = await query.get(partyId);
    const dmObj = await party.get("dm");
    const dmId = dmObj.id;
    const dmQuery = new Parse.Query("User");
    const dm = await dmQuery.get(dmId);
    const players = await party.get("players").query().find();
    return { dm: dm, players: players };
  }

  static async acceptUser(partyId, userId, dm) {
    const partyQuery = new Parse.Query("Party");
    const party = await partyQuery.get(partyId);
    const partyDm = party.get("dm");
    if (partyDm.id != dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can accept users");
    }

    const playerQuery = new Parse.Query("User");
    const player = await playerQuery.get(userId);

    const requestedUsers = party.get("playersRequested");
    requestedUsers.remove(player);

    if (player.get("numParties") >= 100) {
      throw new BadRequestError(
        "This player has reached the maximum limit for parties"
      );
    }

    player.increment("numParties", 1);
    await player.save({}, { useMasterKey: true });

    const players = party.get("players");
    players.add(player);

    await party.save();

    const partyDmQuery = new Parse.Query("User");
    const partyDmObject = await partyDmQuery.get(partyDm.id);

    const notification = new Parse.Object("Notification");
    notification.set("user", player);
    notification.set("type", "accept");
    notification.set("sourceUser", partyDm);
    notification.set("party", party);
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = partyDmObject.toJSON();
    notificationJSON.party = party.toJSON();
    notificationJSON.user = player.toJSON();

    return notificationJSON;
  }

  static async rejectUser(partyId, userId, dm) {
    const partyQuery = new Parse.Query("Party");
    const party = await partyQuery.get(partyId);
    const partyDm = party.get("dm");
    if (partyDm.id != dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can accept users");
    }

    const playerQuery = new Parse.Query("User");
    const player = await playerQuery.get(userId);

    const requestedUsers = party.get("playersRequested");
    requestedUsers.remove(player);

    const partyDmQuery = new Parse.Query("User");
    const partyDmObject = await partyDmQuery.get(partyDm.id);

    await party.save();

    const notification = new Parse.Object("Notification");
    notification.set("user", player);
    notification.set("type", "reject");
    notification.set("sourceUser", partyDm);
    notification.set("party", party);
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = partyDmObject.toJSON();
    notificationJSON.party = party.toJSON();
    notificationJSON.user = player.toJSON();

    return notificationJSON;
  }

  static async handleModifyParty(partyId, body) {
    const bodyProps = ["name", "dm", "searchParameters", "mode"];
    bodyProps.forEach((item) => {
      if (!body.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Properties");
      }
    });
    const searchProps = ["experience", "type", "genre", "level"];
    searchProps.forEach((item) => {
      if (!body.searchParameters.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Search Parameters");
      }
    });
    let party;
    try {
      const partyQuery = new Parse.Query("Party");
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    party.set("name", body.name);
    const userQuery = new Parse.Query("User");
    const dm = await userQuery.get(body.dm);
    if (!dm.get("enabled")) {
      console.log("disabled user");
      throw new BadRequestError("Attempting to modify party for disabled user");
    }
    if (dm.objectId !== party.dm) {
      throw new BadRequestError("Only the DM can modify party settings");
    }
    party.set("searchParameters", body.searchParameters);
    party.set("status", body.mode);
    if (body.hasOwnProperty("image")) {
      party.set("image", body.image);
    }
    let result = await party.save();
    return result.id;
  }

  static async deleteParty(partyId, dm) {
    const partyQuery = new Parse.Query("Party");
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }
    const partyDm = party.get("dm");
    if (partyDm.id != dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can delete parties");
    }

    partyDm.decrement("numParties", 1);
    const dmNotifQuery = new Parse.Query("User");
    const dmNotif = await dmNotifQuery.get(dm.objectId);

    const players = await party.get("players").query().find();
    const notifications = await Promise.all(
      players.map(async (item) => {
        const notification = new Parse.Object("Notification");
        notification.set("user", item);
        notification.set("type", "delete");
        notification.set("sourceUser", dmNotif);
        notification.set("party", party);
        await notification.save();
        const notificationJSON = notification.toJSON();
        notificationJSON.sourceUser = dmNotif.toJSON();
        notificationJSON.party = party.toJSON();
        notificationJSON.user = item.toJSON();
        item.decrement("numParties", 1);
        await item.save({}, { useMasterKey: true });
        return notificationJSON;
      })
    );
    await partyDm.save({}, { useMasterKey: true });
    party.destroy();
    return notifications;
  }

  static async partyRemove(dmId, userId, partyId) {
    const Parties = Parse.Object.extend("Party");
    const partyQuery = new Parse.Query(Parties);
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    const playerQuery = new Parse.Query("User");
    let player;
    try {
      player = await playerQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }
    const dmQuery = new Parse.Query("User");
    let dm;
    try {
      dm = await dmQuery.get(dmId);
    } catch {
      throw new NotFoundError(`Invalid dmId ${dmId}`);
    }
    const partyDm = await party.get("dm");

    if (dm.objectId !== partyDm.objectId) {
      throw new BadRequestError("Only the DM can remove users from a party");
    }

    const notification = new Parse.Object("Notification");
    notification.set("user", player);
    notification.set("type", "remove");
    notification.set("sourceUser", dm);
    notification.set("party", party);
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = dm.toJSON();
    notificationJSON.party = party.toJSON();
    notificationJSON.user = player.toJSON();

    player.decrement("numParties", 1);
    await player.save({}, { useMasterKey: true });

    let playersRelation = party.relation("players");
    playersRelation.remove(player);
    party.save();
    return notificationJSON;
  }

  static async addChat(partyId, body) {
    const partyQuery = new Parse.Query("Party");
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }
    let sender;
    try {
      const userQuery = new Parse.Query("User");
      sender = await userQuery.get(body.senderId);
    } catch {
      throw new NotFoundError(`Invalid senderId ${body.senderId}`);
    }

    const message = new Parse.Object("Message");
    message.set("user", sender);
    message.set("message", body.body);
    await message.save();

    const messages = party.get("messages");
    messages.add(message);
    await party.save();

    return message.get("createdAt");
  }

  static async getMessages(partyId, body) {
    const getMessageUsers = async (messages) => {
      const newMessages = await Promise.all(
        messages.map(async (item) => {
          const user = item.get("user");
          const userId = user.id;
          const userQuery = new Parse.Query("User");
          const messageUser = await userQuery.get(userId);
          const message = item.get("message");
          const date = item.get("createdAt");
          const name = messageUser.get("username");
          const picture = messageUser.get("picture");
          return {
            objectId: item.id,
            senderId: userId,
            user: { username: name, picture: picture },
            createdAt: date,
            body: message,
            ownedByCurrentUser: body.userId === userId,
          };
        })
      );
      return newMessages;
    };

    const partyQuery = new Parse.Query("Party");
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    const messagesLimit = 15;

    const messages = party.get("messages");

    const messagesQuery = messages.query();
    const query = new Parse.Query("Message");

    query.limit(messagesLimit + 1);
    query.matchesKeyInQuery("objectId", "objectId", messagesQuery);
    query.descending("createdAt");

    if (body.hasOwnProperty("firstMessage")) {
      const getFirstQuery = new Parse.Query("Message");
      const firstMessage = await getFirstQuery.get(body.firstMessage.objectId);
      query.lessThan("createdAt", firstMessage.get("createdAt"));
    }

    const messagesObjects = await query.find();

    let reachedEnd = false;
    if (messagesObjects.length <= messagesLimit) {
      reachedEnd = true;
    } else {
      messagesObjects.splice(messagesLimit);
    }

    const returnMessages = await getMessageUsers(messagesObjects);

    returnMessages.reverse();

    return { messages: returnMessages, reachedEnd: reachedEnd };
  }
}

module.exports = Party;
