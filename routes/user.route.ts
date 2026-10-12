import { Router } from "express";
import * as userController from "../controllers/user.controller";
import * as userValidate from "../validates/user.validate";
import multer from "multer";
import { storage } from "../helpers/cloudinary.helper";
import * as authMiddleware from "../middlewares/auth.middleware";
import * as attachments from "../controllers/attachments.controller";

const router = Router();

const upload = multer({ storage: storage });
const personalCVUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1 } });

router.get('/attachments', authMiddleware.verifyTokenUser, attachments.getProfile);
router.patch('/attachments', authMiddleware.verifyTokenUser, attachments.updateProfile);
router.get('/attachments/cv', authMiddleware.verifyTokenUser, attachments.viewCV);
router.post('/attachments/cv', authMiddleware.verifyTokenUser, (req, res, next) => {
  personalCVUpload.single('cv')(req, res, error => {
    if (error) { res.status(400).json({ code: 'error', message: 'Vui lòng chọn một tệp PDF dưới 3 MB.' }); return; }
    next();
  });
}, attachments.uploadCV);

router.post(
  '/register', 
  userValidate.registerPost, 
  userController.registerPost
);

router.post(
  '/login', 
  userValidate.loginPost, 
  userController.loginPost
);

router.patch(
  '/profile', 
  authMiddleware.verifyTokenUser,
  upload.single("avatar"),
  userController.profilePatch
);

router.get(
  '/cv/list', 
  authMiddleware.verifyTokenUser,
  userController.listCV
);

router.get(
  '/cv/detail/:id',
  authMiddleware.verifyTokenUser,
  userController.detailCV
);

router.delete(
  '/cv/delete/:id',
  authMiddleware.verifyTokenUser,
  userController.deleteCVDel
);

export default router;
