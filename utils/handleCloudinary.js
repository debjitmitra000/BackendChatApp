import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64 } from "../lib/base64.js";

const uploadFilesToCloudinary = async(files=[])=>{
    const uploadPromise = files.map((file)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid(),
                }, 
                (error,result)=>{
                    if(error) return reject(error);
                    resolve(result);
                }
            )
        })
    })
    try {
        const results = await Promise.all(uploadPromise);
        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }));
        return formattedResults;
    } catch (err) {
        throw new Error("Error uploading files to cloudinary", err);
    }
}

const deleteFileFromCloudinary = async(public_ids=[]) => {
    const deletePromise = public_ids.map((public_id)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.destroy(public_id, 
                (error,result)=>{
                    if(error) return reject(error);
                    resolve(result);
                }
            )
        })
    })
    try {
        await Promise.all(deletePromise);
    } catch (err) {
        throw new Error("Error deleting files from cloudinary", err);
    }
};


export {
    uploadFilesToCloudinary,
    deleteFileFromCloudinary
}

