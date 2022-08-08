const { Router } = require("express");
const multer = require("multer");
const { SongController } = require("../controller");
const { auth } = require("../middleware");
const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", SongController.getSongs);
router.post(
  "/",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  SongController.uploadSong
);

module.exports = router;
