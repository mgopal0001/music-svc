const config = require("../config");
const { v4: uuidv4 } = require("uuid");
const { Artists } = require("../datacenter/models");
const { S3 } = require("../libs");

class ArtistController {
  static getArtists = async (req, res) => {
    try {
      const { offset, size } = req.query;
      const skip = parseInt(offset);
      const limit =
        size > config.appConfig.artists.pageLimit
          ? config.appConfig.artists.pageLimit
          : parseInt(size);
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
        { $sort: { _id: -1 } },
      ]);

      return res.ok({
        message: "Success",
        data: { offset: skip, artists, size: artists.length },
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
