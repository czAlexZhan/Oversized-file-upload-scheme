const fs = require('fs-extra');
const path = require('path');
const concat = require('concat-files');
class UploadService {
  async getChunkList(filePath, folderPath) {
    const isFileExist = await this.isExist(filePath);
    let result;
    if (isFileExist) {
      // 文件已上传
      result = {
        file: true,
        chunkList: [],
        desc: 'file is exist'
      }
    }else {
      // 文件不存在，返回文件块列表
      let chunkList = [];
      let isFolderExist = await this.isExist(folderPath);
      if (isFolderExist) {
        chunkList = await this.listDir(folderPath);
      }
      result = {
        chunkList,
        file: false,
        desc: 'files'
      };
    }
    return result;
  }

  /**
   * 判断文件或文件夹是否存在
   * @param path
   * @returns {Promise<boolean>}
   */
  isExist(path) {
    return new Promise(resolve => {
      fs.stat(path, (err, stats) => {
        if (err && err.code === 'ENOENT') {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  /**
   * 文件夹是否存在，不存在则创建文件夹
   * @param folder
   */
  async folderIsExist(folder) {
    return await fs.ensureDirSync(path.join(folder));
  }

  /**
   * 列出文件夹下的所有文件
   * @param path
   */
  listDir(path) {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, files) => {
        if (err) {
          reject(err);
        }
        resolve(files);
      })
    })
  }

  /**
   * 合并文件
   * @param dir
   * @param fileName
   */
  concat(dir, fileName) {
    return new Promise((resolve, reject) => {
      concat(dir, fileName, (err) => {
        if(err) {
          reject(err);
        }else {
          resolve('merge success');
        }
      });
    })
  }
}

module.exports = UploadService;
