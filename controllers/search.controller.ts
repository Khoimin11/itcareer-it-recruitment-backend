import { Request, Response } from "express";
import Job from "../models/job.model";
import AccountCompany from "../models/account-company.model";
import City from "../models/city.model";

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const search = async (req: Request, res: Response) => {
  const dataFinal = [];
  let totalPage = 0;
  let totalRecord = 0;

  if(Object.keys(req.query).length > 0) {
    const find: any = {};

    // Language
    if (typeof req.query.language === "string" && req.query.language.trim()) {
      const languageRegex = new RegExp(`^${escapeRegex(req.query.language.trim())}$`, "i");
      find.technologies = languageRegex;
    }

    // City
    if (typeof req.query.city === "string" && req.query.city.trim()) {
      const cityName = req.query.city.trim().replace(/^(?:thành phố|tp\.?)\s+/i, "");
      const cityRegex = new RegExp(
        `^(?:(?:Thành phố|TP\\.?)\\s+)?${escapeRegex(cityName)}$`,
        "i"
      );
      const city = await City.findOne({
        name: cityRegex
      });

      if (city) {
        const listAccountCompanyInCity = await AccountCompany.find({
          city: city._id.toString()
        });

        const listIdAccountCompany = listAccountCompanyInCity.map(
          (item) => item._id.toString()
        );

        find.companyId = { $in: listIdAccountCompany };
      } else {
        find.companyId = { $in: [] };
      }
    }

    // Company
    if (typeof req.query.company === "string" && req.query.company.trim()) {
      const accountCompany = await AccountCompany.findOne({
        companyName: req.query.company.trim()
      });

      if (accountCompany) {
        find.companyId = accountCompany._id.toString();
      } else {
        find.companyId = "__NOT_FOUND__";
      }
    }

    // Keyword
    if (typeof req.query.keyword === "string" && req.query.keyword.trim()) {
      const keywordRegex = new RegExp(escapeRegex(req.query.keyword.trim()), "i");
      find["$or"] = [
        { title: keywordRegex },
        { technologies: keywordRegex }
      ];
    }

    // Position
    if (typeof req.query.position === "string" && req.query.position.trim()) {
      find.position = req.query.position.trim();
    }

    // Working form
    if (typeof req.query.workingForm === "string" && req.query.workingForm.trim()) {
      find.workingForm = req.query.workingForm.trim();
    }

    // Phân trang
    const limitItems = 6;
    let page = 1;
    if(req.query.page) {
      const currentPage = parseInt(`${req.query.page}`);
      if(currentPage > 0) {
        page = currentPage;
      }
    }
    totalRecord = await Job.countDocuments(find);
    totalPage = Math.ceil(totalRecord/limitItems);
    if(page > totalPage && totalPage != 0) {
      page = totalPage;
    }
    const skip = (page - 1) * limitItems;
    // Hết Phân trang

    const jobs = await Job
      .find(find)
      .sort({
        createdAt: "desc"
      })
      .limit(limitItems)
      .skip(skip);

    for (const item of jobs) {
      const itemFinal = {
        id: item.id,
        companyLogo: "",
        title: item.title,
        companyName: "",
        salaryMin: item.salaryMin,
        salaryMax: item.salaryMax,
        position: item.position,
        workingForm: item.workingForm,
        companyCity: "",
        technologies: item.technologies,
      };

      const companyInfo = await AccountCompany.findOne({
        _id: item.companyId
      })

      if(companyInfo) {
        itemFinal.companyLogo = `${companyInfo.logo}`;
        itemFinal.companyName = `${companyInfo.companyName}`;
        
        const city = await City.findOne({
          _id: companyInfo.city
        })
        itemFinal.companyCity = `${city?.name}`;
      }

      dataFinal.push(itemFinal);
    }
  }

  res.json({
    code: "success",
    message: "Thành công!",
    jobs: dataFinal,
    totalPage: totalPage,
    totalRecord: totalRecord
  })
}
