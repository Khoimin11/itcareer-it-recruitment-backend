import { Request, Response } from "express";
import Job from "../models/job.model";
import AccountCompany from "../models/account-company.model";
import City from "../models/city.model";

export const search = async (req: Request, res: Response) => {
  const dataFinal = [];

  if(Object.keys(req.query).length > 0) {
    const find: any = {};

    // Language
    if(typeof req.query.language === "string") {
      find.technologies = req.query.language;
    }

    // City
    if(typeof req.query.city === "string") {
      const city = await City.findOne({
        name: req.query.city
      })

      if(city) {
        const listAccountCompanyInCity = await AccountCompany.find({
          city: city._id.toString()
        })

        const listIdAccountCompany = listAccountCompanyInCity.map(item => item._id.toString());

        find.companyId = { $in: listIdAccountCompany };
      }
    }

    const jobs = await Job
      .find(find)
      .sort({
        createdAt: "desc"
      })

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
    jobs: dataFinal
  })
}
