const config = require("../config");
const { v4: uuidv4 } = require("uuid");
const { Songs, SongArtistMap, Ratings } = require("../datacenter/models");
const { S3 } = require("../libs");

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
      const { songId, rating } = req.body;
      const { uuid } = req.user;

      const ratingObj = await Ratings.findOneAndUpdate(
        { sid: songId, uuid },
        {
          $set: {
            rating,
          },
        },
        {
          upsert: true,
          new: false,
        }
      );

      const songArtistMap = await SongArtistMap.find({ sid: songId });
      const aids = songArtistMap
        .map((val) => {
          return {
            aid: val.aid,
          };
        })
        .filter((val) => {
          return val.aid;
        });

      if (ratingObj) {
        const rt = rating - ratingObj.rating;
        await Songs.updateOne(
          { sid: songId },
          {
            $inc: {
              ratingValue: rt,
              ratingCount: 0,
            },
          }
        );

        if (aids.length) {
          await Artists.updateMany(
            { $or: aids },
            {
              $inc: {
                ratingValue: rt,
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
              ratingValue: rating,
              ratingCount: 1,
            },
          }
        );

        if (aids.length) {
          await Artists.updateMany(
            { $or: aids },
            {
              $inc: {
                ratingValue: rating,
                ratingCount: 1,
              },
            }
          );
        }
      }

      return res.ok({
        message: "Success",
        data: null,
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
