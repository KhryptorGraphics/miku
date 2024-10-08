import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GuidanceQuery } from "../services/text/lib/queryValidation.mjs";
import modelServerSettingsStore from "../services/text/lib/modelServerSettingsStore.mjs";
import { RPModelPermission } from "../services/text/data/rpModelTypes.mjs";

const verifyJWT = async (
  headers: Record<string, any>,
  permissionType?: "tts" | "smart" | "tester"
): Promise<boolean> => {
  return new Promise((resolve) => {
    const authCookie = headers.cookie
      ?.split(";")
      .find((cookie: string) => cookie.includes("Authentication"));
    const bearerToken = authCookie?.split("=")[1] || "";

    if (bearerToken) {
      jwt.verify(
        bearerToken,
        process.env.JWT_SECRET || "",
        (err: unknown, decodedData: any) => {
          if (err || (decodedData.exp || 0) < Date.now() / 1000) {
            resolve(false);
          } else {
            if (permissionType === "tts") {
              resolve(!!decodedData.tts);
            } else if (permissionType === "smart") {
              resolve(!!decodedData.smart);
            } else if (permissionType === "tester") {
              resolve(!!decodedData.tester);
            } else {
              resolve(true);
            }
          }
        }
      );
    } else {
      resolve(false);
    }
  });
};

const jwtPermissionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "POST") {
    if (req.path === "/text") {
      const query = req.body as GuidanceQuery;
      const model = modelServerSettingsStore
        .getRPModels()
        .find((m) => m.id === query.model);
      if (model?.permission === RPModelPermission.PREMIUM) {
        const permission = await verifyJWT(req.headers, "smart");

        if (!permission) {
          return res.status(401).send("Unauthorized: Token expired or missing");
        } else {
          next();
        }
      }
      if (model?.permission === RPModelPermission.TESTER) {
        const permission = await verifyJWT(req.headers, "tester");

        if (!permission) {
          return res.status(401).send("Unauthorized: Token expired or missing");
        } else {
          next();
        }
      }
    } else if (req.path === "/audio") {
      const permission = await verifyJWT(req.headers, "tts");
      if (!permission) {
        return res.status(401).send("Unauthorized: Token expired or missing");
      } else {
        next();
      }
    }

    // if (!(await verifyJWT(req.headers))) {
    //   return res.status(401).send("Unauthorized: Token expired or missing");
    // }
    next();
  } else {
    next();
  }
};

export default jwtPermissionMiddleware;
