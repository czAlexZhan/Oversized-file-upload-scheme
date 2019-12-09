<template>
    <div class="uploadRoot">
        <a-upload :fileList="fileList" :before-upload="beforeUpload" ref="file">
            <a-button>
                <a-icon type="upload"/>
                超大文件上传
            </a-button>
        </a-upload>
        <a-button
                type="primary"
                :disabled="fileList.length === 0"
                :loading="uploading"
                style="margin-top: 16px"
                @click="handleUpload"
        >
            上传
        </a-button>
        <div class="progressDiv">
            <div v-if="uploading">
                <span>校验文件：</span>
                <a-progress :width="150" :percent="checkProgress" />
            </div>
            <template  v-if="checkProgress === 100">
                <a-divider />
                <div>
                    <span>上传文件：</span>
                    <a-progress :width="150" :percent="uploadProgress" />
                </div>
            </template>
        </div>
    </div>
</template>

<script>
  import SparkMD5 from 'spark-md5';
  const baseUrl = 'http://127.0.0.1:7001';
  // 分片大小
  let chunkSize = 10 * 1024 * 1024;
  let fileSize = 0;
  // 总分片数
  let chunks = 0;
  // 已上传区块数量
  let hasUploaded = 0;
  export default {
    name: "upload",
    data() {
      return {
        fileList: [],
        uploading: false,
        // 校验进度
        checkProgress: 0,
        // 文件上传进度
        uploadProgress: 0
      }
    },
    methods: {
      beforeUpload(file) {
        this.fileList = [file];
        return false;
      },
      async handleUpload() {
        const t = this;
        const file = t.fileList[0];
        fileSize = file.size;
        t.uploading = true;
        // 开始校验
        let fileMd5Value  = await t.md5File(file);
        const checkResult = await t.checkFileMD5(file.name, fileMd5Value);
        // 文件已存在并已完整上传
        if(checkResult.file) {
          t.checkProgress = 0;
          t.uploadProgress = 0;
          t.uploading = false;
          t.fileList = [];
          t.$message.info('文件已秒传');
          return false;
        }
        // 开始分片上传
        await t.uploadChunks(fileMd5Value, checkResult.chunkList);
        // 通知服务器全部上传完成
        t.notifyServer(fileMd5Value)
      },
      // 文件生成md5
      md5File(file) {
        const t = this;
        return new Promise((resolve, reject) => {
          let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
            currentChunk = 0,
            spark = new SparkMD5.ArrayBuffer(),
            fileReader = new FileReader();
          // 数据块数量
          chunks = Math.ceil(fileSize / chunkSize);
          fileReader.onload = function (e) {
            t.checkProgress = Math.floor(((currentChunk+1)/chunks) * 10000) / 100;
            spark.append(e.target.result);
            currentChunk++;
            if(currentChunk < chunks) {
              loadChunk();
            }else {
              let res = spark.end();
              resolve(res);
            }
          };
          fileReader.onerror = function () {
            t.$message.warning('Oops~~ 读取文件时错误');
            reject('Oops~~ 读取文件时错误');
          };

          function loadChunk() {
            let start = currentChunk * chunkSize,
              end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
          }
          loadChunk();
        })
      },
      // 检验文件MD5值
      checkFileMD5(fileName, md5) {
        // 检查文件是否存在
        const url = `${baseUrl}/check/fileExist?fileName=${fileName}&md5=${md5}`;
        return new Promise(resolve => {
          this.axios.get(url).then(res => {
            resolve(res.data);
          }).catch(err => {
            console.error(err);
          })
        })
      },
      // 分片上传
      async uploadChunks(md5, chunkList) {
        // 已经上传区块数量
        hasUploaded = chunkList.length;
        for(let i=0; i<chunks; i++) {
          const exit = chunkList.indexOf(i+'') > -1;
          if(!exit) {
            let index = await this.upload(i, md5, chunks);
            hasUploaded++;
            this.uploadProgress = Math.floor((hasUploaded/chunks) * 10000) / 100;
          }
        }
        return true;
      },
      // 上传
      upload(i, fileMd5, chunks) {
        return new Promise(resolve => {
          const t = this;
          const file = t.fileList[0];
          let end = (i+1)*chunkSize >= fileSize ? fileSize : (i+1) *chunkSize;
          let formData = new FormData();
          formData.append('total', chunks);
          formData.append('index', i);
          formData.append('fileMd5', fileMd5);
          formData.append('file', file.slice(i * chunkSize, end));
          t.axios.post(`${baseUrl}/upload/file`, formData).then(res => {
            resolve(res.data.index);
          }).catch(err => {
            console.error(err);
          });
        })
      },
      // 通知
      notifyServer(fileMd5) {
        const t = this;
        const file = t.fileList[0];
        const url = `${baseUrl}/mergeFile?md5=${fileMd5}&fileName=${file.name}&fileSize=${fileSize}`;
        t.axios.get(url).then(res => {
          t.$message.success('上传成功');
          t.checkProgress = 0;
          t.fileList = [];
          t.uploadProgress = 0;
          t.uploading = false;
        })
      }
    }
  }
</script>

<style scoped lang="less">
    .uploadRoot {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .progressDiv {
        width: 500px;
        margin-top: 50px;
        & > div {
            display: flex;
            span {
                white-space: nowrap;
            }
        }
    }
</style>
