const config = require("../config");
const { v4: uuidv4 } = require("uuid");
const { Songs, SongArtistMap, Ratings, Users } = require("../datacenter/models");
const { S3 } = require("../libs");
const { default: mongoose } = require("mongoose");
const { ArtistValidation, SongValidation } = require("../utils/validation");
const { logger } = require("../utils");

class SongController {
   /**
   * Get songs with their artists and rating
   * @param {*} req 
   * @param {*} req.query 
   * @param {number} req.query.offset 
   * @param {number} req.query.size
   * @param {*} res 
   * @returns 
   */
  static getSongs = async (req, res) => {
    try {
      const { skip, limit } = ArtistValidation.validateGetArtists({
        pageSize: config.appConfig.songs.pageLimit,
        offset: req.query.offset,
        size: req.query.size
      });

      const totalSongs = await Songs.countDocuments();
      const songs = await Songs.aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "SongArtistMap",
            localField: "sid",
            foreignField: "sid",
            as: "song_artist_map",
          },
        },
        {
          $lookup: {
            from: "Artists",
            localField: "song_artist_map.aid",
            foreignField: "aid",
            as: "artists",
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
        data: { offset: skip, songs, count: totalSongs },
        sucess: true,
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
   * Get top songs by rating
   * @param {*} req 
   * @param {*} req.query
   * @param {number} req.query.offset
   * @param {number} req.query.size
   * @param {*} res 
   * @returns 
   */
  static getTopSongs = async (req, res) => {
    try {
      const { skip, limit } = ArtistValidation.validateGetArtists({
        pageSize: config.appConfig.songs.pageLimit,
        offset: req.query.offset,
        size: req.query.size
      });

      const totalSongs = await Songs.countDocuments();
      const topSongs = await Songs.aggregate([
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
        data: {
          songs: topSongs,
          offset: skip,
          count: totalSongs
        },
        success: true,
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
   * @param {*} req.body 
   * @param {*} req.body.userRating 
   * @param {*} req.query 
   * @param {*} req.query.songId 
   * @param {*} res 
   * @returns 
   */
  static rateSong = async (req, res) => {
    try {
      const { songId, userRating } = SongValidation.validateRateSong({
        songId: req.query.songId,
        userRating: req.body.userRating
      });
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
        user: async (asyncCb) => {
          try{
            const user = await Users.findOne({ uuid });
            
            if(!user){
              throw new Error("Invalid user");
            }

            return asyncCb(null, user);
          }catch(err){
            return asyncCb(err);
          }
        },
        rating: [
          "user",
          async (asyncCb, results) => {
            try{
              const rating = await Ratings.findOneAndUpdate(
                { sid: songId, uuid },
                {
                  $set: {
                    rating: userRating,
                  },
                },
                {
                  upsert: true,
                  new: false,
                  session: results.session
                }
              );
              return asyncCb(null, rating);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        aIds: [
          "user",
          async (asyncCb) => {
            try{
              const songArtistMap = await SongArtistMap.find({ sid: songId });
              const aIds = songArtistMap
                .map((val) => {
                  return {
                    aid: val.aid,
                  };
                })
                .filter((val) => {
                  return val.aid;
                });
              return asyncCb(null, aIds);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateSongAndArtist: [
          "user",
          async (asyncCb, results) => {
            try{
              if (results.rating) {
                const rating = userRating - results.rating.rating;

                await Songs.updateOne(
                  { sid: songId },
                  {
                    $inc: {
                      ratingValue: rating,
                      ratingCount: 0,
                    },
                  },
                  {
                    session: results.session
                  }
                );
        
                if (results.aIds.length > 0) {
                  await Artists.updateMany(
                    { $or: aids },
                    {
                      $inc: {
                        ratingValue: rating,
                        ratingCount: 0,
                      },
                    }
                  );
                }
              } else {
                await Songs.updateOne(
                  { sid: songId },
                  {
                    $inc: {
                      ratingValue: userRating,
                      ratingCount: 1,
                    },
                  }
                );
        
                if (aids.length) {
                  await Artists.updateMany(
                    { $or: aids },
                    {
                      $inc: {
                        ratingValue: userRating,
                        ratingCount: 1,
                      },
                    }
                  );
                }
              }

              return asyncCb(null);
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, async (err, results) => {
        if(err){
          await results.session.abortTransaction();
          return res.internalServerError({
            message: "Internal Server Error",
            success: false,
            err: new Error("Internal Server Error"),
          });
        }

        console.log(results);

        return res.ok({
          message: "success",
          data: { songId, userRating },
          success: true,
        });
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
   * @param {*} req.query.songId 
   * @param {*} res 
   * @returns 
   */
  static deleteSong = async (req, res) => {
    try {
      const { songId } = SongValidation.validateDeleteSong({
        songId: req.query.songId
      });
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
        user: async (asyncCb) => {
          try{
            const user = await Users.findOne({ uuid });
            
            if(!user){
              throw new Error("Invalid user");
            }

            return asyncCb(null, user);
          }catch(err){
            return asyncCb(err);
          }
        },
        song: [
          "user",
          async (asyncCb, results) => {
            try{
              const song = await Songs.findOneAndDelete({ sid: songId }, {
                session: results.session
              });
  
              return asyncCb(null, song);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        rating: [
          "user",
          async (asyncCb, results) => {
            try{
              const rating = await Ratings.deleteMany(
                { sid: songId },
                {
                  session: results.session
                }
              );
              return asyncCb(null, rating);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        aIds: [
          "user",
          async (asyncCb) => {
            try{
              const songArtistMap = await SongArtistMap.find({ sid: songId });
              const aIds = songArtistMap
                .map((val) => {
                  return {
                    aid: val.aid,
                  };
                })
                .filter((val) => {
                  return val.aid;
                });
              return asyncCb(null, aIds);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateArtists: [
          "user",
          async (asyncCb, results) => {
            try{
              if (results.aIds.length > 0) {
                await Artists.updateMany(
                  { $or: aids },
                  {
                    $inc: {
                      ratingValue: -1 * results.song.ratingCount,
                      ratingCount: -1 * results.song.ratingValue,
                    },
                  }
                );
              }
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        deleteFiles: [
          "user",
          "updateArtists",
          "song",
          async (asyncCb, results) => {
            try{
              const imageData = await S3.deleteFile(
                "image/" + results.song.sid + ".jpg",
                "guru-images-jnvsumit"
              );
        
              const audioData = await S3.deleteFile(
                "audio/" + results.song.sid + ".mp3",
                "guru-images-jnvsumit"
              );
            }catch(err){
              return asyncCb(err);
            }
          }
        ]
      }, async (err, results) => {
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

  /**
   * 
   * @param {*} req 
   * @param {*} req.query 
   * @param {*} req.query.sondId 
   * @param {*} req.body 
   * @param {*} req.body.songTitle 
   * @param {*} req.body.dateOfRelease 
   * @param {*} req.body.artistsToAdd 
   * @param {*} req.body.artistsToDelete 
   * @param {*} req.file 
   * @param {*} res 
   * @returns 
   */
  static updateSong = async (req, res) => {
    try {
      const { uuid } = req.user;
      const { songTitle, dateOfRelease, artistsToAdd, artistsToDelete, songId, image } = SongValidation.validateUpdateSong({
        songTitle: req.body.songTitle,
        dateOfRelease: req.body.dateOfRelease,
        artistsToAdd: req.body.artistsToAdd,
        artistsToDelete: req.body.artistsToDelete,
        songId: req.body.songId,
        image: req.file
      });
      const dor = new Date(dateOfRelease);

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
        user: async (asyncCb) => {
          try{
            const user = await Users.findOne({ uuid });
            
            if(!user){
              throw new Error("Invalid user");
            }

            return asyncCb(null, user);
          }catch(err){
            return asyncCb(err);
          }
        },
        song: [
          "user",
          async (asyncCb) => {
            try{
              const song = await Songs.findOne({ sid: songId, uuid });

              if(!song){
                throw new Error("User is not authorized");
              }
  
              return asyncCb(null, song);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        aIds: [
          "song",
          async (asyncCb) => {
            try{
              const aIdsToDelete = [], aIdsToAdd = [];
              const songArtistMap = await SongArtistMap.find({ sid: songId });
              const aIds = songArtistMap
                .map((val) => {
                  return val.aid;
                })
                .filter((val) => {
                  return val.aid;
                });

              for(const aId of aIds){
                const a = artistsToAdd.includes(aId);
                const b = artistsToDelete.includes(aId);
                
                if(a && b){
                  continue;
                }

                if(a){
                  aIdsToAdd.push(aId);
                }

                if(b){
                  aIdsToDelete.push(aId);
                }
              }

              return asyncCb(null, { aIdsToAdd, aIdsToDelete });
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        rating: [
          "aIds",
          async (asyncCb, results) => {
            try{
              await Ratings.deleteMany(
                { $or: results.aIds.aIdsToDelete.map(aId => {
                  return {aid: aId, sid: songId};
                }) },
                {
                  session: results.session
                }
              );

              await Ratings.insertMany(
                results.aIds.aIdsToAdd.map(aId => {
                  return {aid: aId, sid: songId};
                }),
                {
                  session: results.session
                }
              );
              return asyncCb(null, rating);
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateSong: [
          "rating",
          async (asyncCb, results) => {
            try{
              const updateObj = {};

              if(songTitle){
                updateObj["title"] = songTitle;
              }

              if(dor){
                updateObj["dor"] = dor;
              }

              await Songs.updateOne({sid: songId, uuid}, {
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
        updateFiles: [
          "user",
          "updateSong",
          "song",
          async (asyncCb, results) => {
            try{
              if(image){
                const imageData = await S3.putFile(
                  "image/" + results.song.sid + ".jpg",
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

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.songTitle 
   * @param {*} req.body.dateOfRelease 
   * @param {*} req.body.artistIds 
   * @param {*} req.files 
   * @param {*} req.files.image
   * @param {*} req.files.audio
   * @param {*} res 
   * @returns 
   */
  static uploadSong = async (req, res) => {
    try {
      const { songTitle, dateOfRelease, artistIds, image, audio } = SongValidation.validateUploadSong({
        songTitle: req.body.songTitle,
        dateOfRelease: req.body.dateOfRelease,
        artistIds: req.body.artistIds,
        image: req.files["image"][0],
        audio: req.files["audio"][0]
      });
      const { uuid } = req.user;
      const sid = uuidv4();
      const dor = new Date(dateOfRelease);

      const imageData = await S3.putFile(
        "image/" + sid + ".jpg",
        image.buffer,
        "guru-images-jnvsumit"
      );

      const audioData = await S3.putFile(
        "audio/" + sid + ".mp3",
        audio.buffer,
        "guru-images-jnvsumit"
      );

      const imagePath = imageData.Location;
      const audioPath = audioData.Location;

      const saMap = artistIds.map((artistId) => {
        return {
          sid,
          aid: artistId,
        };
      });

      await SongArtistMap.insertMany(saMap);

      const song = new Songs({
        sid,
        uuid,
        dor,
        title: songTitle,
        image: imagePath,
        audio: audioPath,
      });

      await song.save();

      return res.created({
        message: "success",
        data: {
          sid,
          uuid,
          dateOfRelease: dor,
          songTitle,
          image: imagePath,
          audio: audioPath,
        },
        success: true,
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
}

module.exports = SongController;
