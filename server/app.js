const Koa = require('koa');
const app = new Koa();
const cors = require('koa2-cors');
const Router = require('koa-router');
const router = new Router();
const fs = require('fs-extra');
const Service = require('./service/upload');
const service = new Service();
const path = require('path');
const multiparty = require("koa2-multiparty");

fs.ensureDirSync(path.resolve('temp'));
app.use(cors());

router.get('/', async (ctx, next) => {
  ctx.body = 'hello koa';
})
  .get('/check/fileExist', async (ctx) => {
    /**
     * 检查文件是否上传过
     * @returns {Promise<void>}
     */
    const fileName = ctx.query.fileName;
    const md5 = ctx.query.md5;
    const uploadDir = path.resolve('temp');
    const res = await service.getChunkList(path.join(uploadDir, fileName), path.join(uploadDir, md5));
    ctx.body = {...res};
  })
  .post('/upload/file', multiparty({uploadDir: 'temp'}), async ctx => {
    const body = ctx.req.body;
    const index = body.index;
    const fileMd5 = body.fileMd5;
    const files = ctx.req.files;
    const folder = path.resolve('temp', fileMd5);
    try {
      await service.folderIsExist(folder);
      const destFile = path.resolve(folder, index);
      fs.renameSync(files.file.path, destFile);
      ctx.body = {
        index,
        desc: 'success',
      }
    } catch (e) {
      console.log(e);
      ctx.body = {
        index,
        desc: e
      }
    }
  })
  .get('/mergeFile', async ctx => {
    const md5 = ctx.query.md5;
    const fileName = ctx.query.fileName;
    const fileSize = ctx.query.fileSize;
    const srcPath = path.resolve('temp', md5);
    try {
      const fileArr = await service.listDir(srcPath);
      for(let i = 0; i < fileArr.length; i++) {
        fileArr[i] = srcPath + '/' + fileArr[i]
      }
      const msg = await service.concat(fileArr, path.resolve('temp', fileName));
      fs.removeSync(srcPath);
      ctx.body = {
        stat: 1,
        desc: msg
      }
    }catch (e) {
      ctx.body = {
        stat: 0,
        desc: e
      }
    }
  });


app.use(router.routes()).use(router.allowedMethods());

app.listen(7001, () => {
  console.log("服务已开启")
});


