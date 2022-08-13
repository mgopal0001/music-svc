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

  static deleteArtist = async (req, res) => {
    try {
      const { artistId } = req.body;
      const { uuid } = req.user;

      async.auto({
        session: (asyncCb) => {
          try{
            const session = await mongoose.startSession();
            session.startTransaction();
            return asyncCb(null, session);
          }catch(err){
            return asyncCb(err);
          }
        },
        artist: (asyncCb) => {
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
          (asyncCb, results) => {
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
          (asyncCb, results) => {
            try{
              await Artists.deleteOne({ aid: artistId }, {
                session: results.session
              });
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        deleteFile: [
          "deleteArtist",
          (asyncCb) => {
            try{
              const imageData = await S3.deleteFile(
                "image/" + artistId + ".jpg",
                "guru-images-jnvsumit"
              );
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, (err, results) => {
        if(err){
          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            data: null,
            err: new Error("Internal Server Error"),
          });
        }

        console.log(results);

        return res.ok({
          message: "Success",
          data: null,
          err: null,
        });
      });
    } catch (err) {
      console.log(err);
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static updateArtist = async (req, res) => {
    try {
      const { artistId } = req.query;
      const { artistName, dateOfBirth } = req.body;
      const { uuid } = req.user;
      const dob = new Date(dateOfBirth);
      const image = req.file;

      if (!image || !(image.mimetype || "").includes("image")) {
        return res.forbidden({
          message: "Please upload a valid image file",
          data: null,
          err: null,
        });
      }

      if (image.size > 1024 * 1024) {
        return res.forbidden({
          message: "Image size must be less than 1 MB",
          data: null,
          err: null,
        });
      }

      async.auto({
        session: (asyncCb) => {
          try{
            const session = await mongoose.startSession();
            session.startTransaction();
            return asyncCb(null, session);
          }catch(err){
            return asyncCb(err);
          }
        },
        artist: (asyncCb) => {
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
          (asyncCb, results) => {
            try{
              await Artists.updateOne({aid: artistId, uuid}, {
                $set: {
                  name: artistName,
                  dob
                }
              }, {
                session: results.session
              })
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateFile: [
          "artist",
          "updateArtist",
          (asyncCb, results) => {
            try{
              const imageData = await S3.putFile(
                "image/" + results.artist.aid + ".jpg",
                image.buffer,
                "guru-images-jnvsumit"
              );
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, (err, results) => {
        if(err){
          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            data: null,
            err: new Error("Internal Server Error"),
          });
        }

        console.log(results);

        return res.ok({
          message: "Success",
          data: null,
          err: null,
        });
      });
    } catch (err) {
      console.log(err);
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static uploadArtist = async (req, res) => {
    try {
      const { name, dateOfBirth } = req.body;
      const { uuid } = req.user;
      const aid = uuidv4();
      const dob = new Date(dateOfBirth);
      const image = req.file;

      if (!image || !(image.mimetype || "").includes("image")) {
        return res.forbidden({
          message: "Please upload a valid image file",
          data: null,
          err: null,
        });
      }

      if (image.size > 1024 * 1024) {
        return res.forbidden({
          message: "Image size must be less than 1 MB",
          data: null,
          err: null,
        });
      }

      const imageData = await S3.putFile(
        "image/" + aid + ".jpg",
        image.buffer,
        "guru-images-jnvsumit"
      );

      const imagePath = imageData.Location;

      const artist = new Artists({
        aid,
        uuid,
        dob,
        name,
        image: imagePath,
      });

      await artist.save();

      return res.created({
        message: "Success",
        data: {
          aid,
          uuid,
          dateOfBirth: dob,
          name,
          image: imagePath,
        },
        err: null,
      });
    } catch (err) {
      console.log(err);
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };
}

module.exports = ArtistController;
