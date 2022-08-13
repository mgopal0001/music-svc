const config = require("../config");
const { v4: uuidv4 } = require("uuid");
const { logger, ArtistValidation } = require('../utils');
const async = require('async');
const { Artists, SongArtistMap } = require("../datacenter/models");
const { S3 } = require("../libs");

/**
 * Artist controller
 */
class ArtistController {
  /**
   * Get artists with their songs and rating
   * @param {*} req 
   * @param {*} req.query 
   * @param {number} req.query.offset 
   * @param {number} req.query.size
   * @param {*} res 
   * @returns 
   */
  static getArtists = async (req, res) => {
    try {
      const { skip, limit } = ArtistValidation.validateGetArtists({ 
        offset: req.query.offset, 
        size: req.query.size, 
        pageSize: config.appConfig.artists.pageLimit 
      });
     
      const totalArtists = await Artists.countDocuments();
      const artists = await Artists.aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "SongArtistMap",
            localField: "aid",
            foreignField: "aid",
            as: "song_artist_map",
          },
        },
        {
          $lookup: {
            from: "Songs",
            localField: "song_artist_map.sid",
            foreignField: "sid",
            as: "songs",
          },
        },
        {
          $project: {
            song_artist_map: 0,
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return res.ok({
        message: "success",
        success: true,
        data: { 
          offset: skip, 
          artists, 
          count: totalArtists
        },
      });
    } catch (err) {
      console.log(err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * Get top artists by rating
   * @param {*} req 
   * @param {*} req.query
   * @param {number} req.query.offset
   * @param {number} req.query.size
   * @param {*} res 
   * @returns 
   */
  static getTopArtists = async (req, res) => {
    try {
      const { skip, limit } = ArtistValidation.validateGetArtists({ 
        offset: req.query.offset, 
        size: req.query.size, 
        pageSize: config.appConfig.artists.pageLimit 
      });

      const totalArtists = await Artists.countDocuments();
      const topArtists = await Artists.aggregate([
        {
          $addFields: {
            avg: { $divide: ["$ratingValue", "$ratingCount"] },
          },
        },
        { $sort: { avg: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      return res.ok({
        message: "success",
        success: true,
        data: {
          offset: skip,
          artists: topArtists,
          count: totalArtists
        },
      });
    } catch (err) {
      console.log(err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.query 
   * @param {string} req.query.artistId
   * @param {*} res 
   * @returns 
   */
  static deleteArtist = async (req, res) => {
    try {
      const { artistId } = ArtistValidation.validateDeleteArtist({ artistId: req.query.artistId });
      const { uuid } = req.user;

      async.auto({
        session: async (asyncCb) => {
          try{
            const session = await mongoose.startSession();
            session.startTransaction();
            return asyncCb(null, session);
          }catch(err){
            return asyncCb(err);
          }
        },
        artist: async (asyncCb) => {
          try{
            const artist = await Artists.findOne({ uuid, aid: artistId });
            
            if(!artist){
              throw new Error("Not found");
            }

            return asyncCb(null, artist);
          }catch(err){
            return asyncCb(err);
          }
        },
        songArtistMap: [
          "artist",
          async (asyncCb, results) => {
            try{
              const songArtistMap = await SongArtistMap.deleteMany(
                { aid: artistId },
                {
                  session: results.session
                }
              );

              return asyncCb(null, songArtistMap);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        deleteArtist: [
          "songArtistMap",
          async (asyncCb, results) => {
            try{
              await Artists.deleteOne({ aid: artistId }, {
                session: results.session
              });

              return asyncCb(null);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        deleteFile: [
          "deleteArtist",
          async (asyncCb) => {
            try{
              const imageData = await S3.deleteFile(
                "image/" + artistId + ".jpg",
                "guru-images-jnvsumit"
              );

              return asyncCb(null, imageData);
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, async (err, results) => {
        if(err){
          logger.error("Something went wrong", err);

          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            success: false,
            err: new Error("Internal Server Error"),
          });
        }

        logger.info("Artist deleted successfully");

        return res.ok({
          message: "success",
          data: {
            artistId
          },
          success: true
        });
      });
    } catch (err) {
      logger.error("Something went wrong", err);

      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.query 
   * @param {*} req.query.artistId 
   * @param {*} req.body
   * @param {*} req.body.artistName
   * @param {*} req.body.dateOfBirth
   * @param {*} req.file
   * @param {*} res 
   * @returns 
   */
  static updateArtist = async (req, res) => {
    try {
      const { uuid } = req.user;
      const { artistId, artistName, dateOfBirth, image } = ArtistValidation.validateUpdateArtist({
        artistId: req.query.artistId,
        artistName: req.body.artistName,
        dateOfBirth: req.body.dateOfBirth,
        image: req.file
      });
      const dob = dateOfBirth ? new Date(dateOfBirth) : null;

      async.auto({
        session: async (asyncCb) => {
          try{
            const session = await mongoose.startSession();
            session.startTransaction();
            return asyncCb(null, session);
          }catch(err){
            return asyncCb(err);
          }
        },
        artist: async (asyncCb) => {
          try{
            const artist = await Artists.findOne({ uuid, aid: artistId });
            
            if(!artist){
              throw new Error("Not found");
            }

            return asyncCb(null, artist);
          }catch(err){
            return asyncCb(err);
          }
        },
        updateArtist: [
          "rating",
          async (asyncCb, results) => {
            try{
              const updateObj = {};

              if(artistName) {
                updateObj["name"] = artistName;
              }

              if(dob) {
                updateObj["dob"] = dob;
              }

              await Artists.updateOne({aid: artistId, uuid}, {
                $set: updateObj
              }, {
                session: results.session
              });

              return asyncCb(null);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateFile: [
          "artist",
          "updateArtist",
          async (asyncCb, results) => {
            try{
              if(image){
                await S3.putFile(
                  "image/" + results.artist.aid + ".jpg",
                  image.buffer,
                  "guru-images-jnvsumit"
                  );
                }

                return asyncCb(null);
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, async (err, results) => {
        if(err){
          logger.error("Something went wrong", err);

          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            success: false,
            err: new Error("Internal Server Error"),
          });
        }

        logger.info("Artist updated", results);

        return res.ok({
          message: "success",
          data: {
            artistId
          },
          success: true,
        });
      });
    } catch (err) {
      logger.error("Something went wrong", err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static uploadArtist = async (req, res) => {
    try {
      const { uuid } = req.user;
      const { artistName, dateOfBirth, image } = ArtistValidation.validateUploadArtist({
        artistName: req.body.artistName,
        dateOfBirth: req.body.dateOfBirth,
        image: req.file
      });
      const dob = new Date(dateOfBirth);

      async.auto({
        session: async (asyncCb) => {
          try{
            const session = await mongoose.startSession();
            session.startTransaction();
            return asyncCb(null, session);
          }catch(err){
            return asyncCb(err);
          }
        },
        saveArtist: [
          "session",
          async (asyncCb, results) => {
            try{
              const artist = new Artists({
                aid: uuidv4(),
                uuid,
                dob,
                name: artistName
              });
        
              await artist.save({
                session: results.session
              });

              return asyncCb(null, artist);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        uploadFile: [
          "saveArtist",
          async (asyncCb, results) => {
            try{
              const imageData = await S3.putFile(
                "image/" + results.saveArtist.aid + ".jpg",
                image.buffer,
                "guru-images-jnvsumit"
                );

                return asyncCb(null, imageData);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateFilePath: [
          "uploadFile",
          async (asyncCb, results) => {
            try{
              await Artists.updateOne({ aid: results.saveArtist.aid}, {
                $set: {
                  image: results.updateFile.Location
                }
              });

              return asyncCb(null);
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, async (err, results) => {
        if(err){
          logger.error("Something went wrong", err);

          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            success: false,
            err: new Error("Internal Server Error"),
          });
        }

        logger.info("Artist uploaded", results);

        return res.ok({
          message: "success",
          data: {
            artistName,
            dateOfBirth: dob,
            image: results.uploadFile.Location,
            aId: results.saveArtist.aid,
            uuid
          },
          success: true,
        });
      });
    } catch (err) {
      logger.error("Something went wrong", err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };
}

module.exports = ArtistController;
