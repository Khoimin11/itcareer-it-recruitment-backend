import { Router } from "express";
import * as companyController from "../controllers/company.controller";
import * as companyValidate from "../validates/company.validate";
import multer from "multer";
import { storage } from "../helpers/cloudinary.helper";
import * as authMiddleware from "../middlewares/auth.middleware";

const router = Router();

const upload = multer({ storage: storage });

router.post(
  '/register', 
  companyValidate.registerPost, 
  companyController.registerPost
);

router.post(
  '/login', 
  companyValidate.loginPost, 
  companyController.loginPost
);

router.patch(
  '/profile', 
  authMiddleware.verifyTokenCompany,
  upload.single("logo"),
  companyController.profilePatch
);

router.post(
  '/job/create', 
  authMiddleware.verifyTokenCompany,
  upload.array('images', 8),
  companyController.createJobPost
);

router.get(
  '/job/list', 
  authMiddleware.verifyTokenCompany,
  companyController.listJob
);

export default router;