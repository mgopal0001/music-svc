const config = require("../config");
const { v4: uuidv4 } = require("uuid");
const { Songs, SongArtistMap, Ratings, Users } = require("../datacenter/models");
const { S3 } = require("../libs");
const { default: mongoose } = require("mongoose");

class SongController {
  static getSongs = async (req, res) => {
    try {
      const { offset, size } = req.query;
      const skip = parseInt(offset);
      const limit =
        size > config.appConfig.songs.pageLimit
          ? config.appConfig.songs.pageLimit
          : parseInt(size);
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
        message: "Success",
        data: { offset: skip, songs, size: songs.length },
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

  static getTopSongs = async (req, res) => {
    try {
      const { size } = req.query;
      const limit = parseInt(size);

      const topSongs = await Songs.aggregate([
        {
          $addFields: {
            avg: { $divide: ["$ratingValue", "$ratingCount"] },
          },
        },
        { $sort: { avg: -1 } },
        { $limit: limit },
      ]);

      return res.ok({
        message: "Success",
        data: topSongs,
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

  static rateSong = async (req, res) => {
    try {
      const { songId, userRating } = req.body;
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
        user: (asyncCb) => {
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
          (asyncCb, results) => {
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
          (asyncCb) => {
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
          (asyncCb, results) => {
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

  static deleteSong = async (req, res) => {
    try {
      const { songId } = req.body;
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
        user: (asyncCb) => {
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
          (asyncCb, results) => {
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
          (asyncCb, results) => {
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
          (asyncCb) => {
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
          (asyncCb, results) => {
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
          (asyncCb, results) => {
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

  static updateSong = async (req, res) => {
    try {
      const { songId } = req.query;
      const { title, dateOfRelease, artistsToAdd, artistsToDelete } = req.body;
      const { uuid } = req.user;
      const dor = new Date(dateOfRelease);
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
        user: (asyncCb) => {
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
          (asyncCb) => {
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
          (asyncCb) => {
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
          (asyncCb, results) => {
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
          (asyncCb, results) => {
            try{
              await Songs.updateOne({sid: songId, uuid}, {
                $set: {
                  title,
                  dor
                }
              }, {
                session: results.session
              })
            }catch(err){
              return asyncCb(err);
            }
          }
        ],
        updateFiles: [
          "user",
          "updateSong",
          "song",
          (asyncCb, results) => {
            try{
              const imageData = await S3.putFile(
                "image/" + results.song.sid + ".jpg",
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

  static uploadSong = async (req, res) => {
    try {
      const { title, dateOfRelease, artistIds } = req.body;
      const { uuid } = req.user;
      const sid = uuidv4();
      const dor = new Date(dateOfRelease);
      const image = req.files["image"][0];
      const audio = req.files["audio"][0];

      if (!image || !(image.mimetype || "").includes("image")) {
        return res.forbidden({
          message: "Please upload a valid image file",
          data: null,
          err: null,
        });
      }

      if (!audio || !(audio.mimetype || "").includes("audio")) {
        return res.forbidden({
          message: "Please upload a valid audio file",
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

      if (audio.size > 1024 * 1024 * 10) {
        return res.forbidden({
          message: "Audio size must be less than 1 MB",
          data: null,
          err: null,
        });
      }

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
        title,
        image: imagePath,
        audio: audioPath,
      });

      await song.save();

      return res.created({
        message: "Success",
        data: {
          sid,
          uuid,
          dateOfRelease: dor,
          title,
          image: imagePath,
          audio: audioPath,
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

module.exports = SongController;
