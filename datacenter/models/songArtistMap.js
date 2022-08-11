const mongoose = require("mongoose");

const SongArtistMap = new mongoose.Schema(
  {
    sid: {
      type: String,
      required: true,
    },
    aid: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

SongArtistMap.index({ sid: 1, aid: 1 }, { unique: true });

module.exports = mongoose.model(
  "SongArtistMap",
  SongArtistMap,
  "SongArtistMap"
);
