const { Router } = require("express");
const multer = require("multer");
const { ArtistController } = require("../controller");
const { auth } = require("../middleware");
const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", ArtistController.getArtists);
router.post("/", auth, upload.single("image"), ArtistController.uploadArtist);
router.delete("/", auth, ArtistController.deleteArtist);
router.patch("/", auth, upload.single("image"), ArtistController.updateArtist);

module.exports = router;
