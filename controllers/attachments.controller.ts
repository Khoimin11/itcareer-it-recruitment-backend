import { Response } from "express";
import sanitizeHtml from "sanitize-html";
import { AccountRequest } from "../interfaces/request.interface";
import AccountUser from "../models/account-user.model";
import PersonalCV from "../models/personal-cv.model";

const basicKeys = ["fullName", "title", "email", "phone", "birthday", "gender", "address", "linkedin"] as const;
const generalKeys = ["experience", "level", "education", "major", "skills", "workingForms", "industries", "salary", "languages", "availability"] as const;
export const cleanLetter = (html: string) => sanitizeHtml(html, {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote"],
  allowedAttributes: {},
});
const cvInfo = (cv: { name: string; size: number; updatedAt: Date } | null) => cv ? { name: cv.name, size: cv.size, updatedAt: cv.updatedAt } : null;

export const getProfile = async (req: AccountRequest, res: Response) => {
  res.set("Cache-Control", "private, no-store");
  const account = req.account;
  const cv = await PersonalCV.findOne({ userId: account.id });
  res.json({ code: "success", profile: {
    basic: Object.fromEntries(basicKeys.map(key => [key, account[key] || ""])),
    avatar: account.avatar || "",
    general: Object.fromEntries(generalKeys.map(key => [key, account.general?.[key] || ""])),
    letter: cleanLetter(account.introduction || ""), cv: cvInfo(cv)
  } });
};

export const updateProfile = async (req: AccountRequest, res: Response) => {
  const { section, values } = req.body || {};
  if (!["basic", "general", "letter"].includes(section)) {
    res.status(400).json({ code: "error", message: "Nội dung cập nhật không hợp lệ." }); return;
  }
  const update: Record<string, string> = {};
  if (section === "letter") {
    if (typeof values !== "string" || values.length > 20000) {
      res.status(400).json({ code: "error", message: "Thư giới thiệu quá dài (tối đa 20.000 ký tự HTML)." }); return;
    }
    update.introduction = cleanLetter(values);
  } else {
    const keys = section === "basic" ? basicKeys : generalKeys;
    if (!values || typeof values !== "object" || Array.isArray(values) || keys.some(key => typeof values[key] !== "string" || values[key].length > 2000)) {
      res.status(400).json({ code: "error", message: "Thông tin hồ sơ không hợp lệ." }); return;
    }
    for (const key of keys) update[section === "general" ? `general.${key}` : key] = values[key].trim();
    if (section === "basic") {
      // Email is managed in Thông tin cá nhân; keep the current login identity here.
      delete update.email;
      if (!update.fullName) {
        res.status(400).json({ code: "error", message: "Vui lòng nhập họ tên." }); return;
      }
      if (update.birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(update.birthday) || Number.isNaN(Date.parse(update.birthday)))) {
        res.status(400).json({ code: "error", message: "Ngày sinh không hợp lệ." }); return;
      }
    }
  }
  await AccountUser.updateOne({ _id: req.account.id }, { $set: update });
  req.account = await AccountUser.findById(req.account.id);
  await getProfile(req, res);
};

export const uploadCV = async (req: AccountRequest, res: Response) => {
  const file = req.file;
  if (!file || file.size === 0 || file.size >= 3 * 1024 * 1024 || !/\.pdf$/i.test(file.originalname) || file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    res.status(400).json({ code: "error", message: "Vui lòng chọn CV định dạng PDF, dung lượng dưới 3 MB." }); return;
  }
  const decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");
  const cv = await PersonalCV.findOneAndUpdate({ userId: req.account.id }, { $set: {
    name: decodedName.includes("\uFFFD") ? file.originalname : decodedName,
    size: file.size, data: file.buffer
  } }, { upsert: true, returnDocument: "after", runValidators: true });
  res.json({ code: "success", cv: cvInfo(cv) });
};

export const viewCV = async (req: AccountRequest, res: Response) => {
  const cv = await PersonalCV.findOne({ userId: req.account.id }).select("+data");
  if (!cv?.data) { res.status(404).json({ code: "error", message: "Chưa có CV cá nhân." }); return; }
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="CV.pdf"; filename*=UTF-8''${encodeURIComponent(cv.name)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.send(cv.data);
};
