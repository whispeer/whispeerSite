import RequestKeyService from "./requestKey.service";
const keyStore = require("../crypto/keyStore.js");

keyStore.upload.setKeyGet(RequestKeyService.getKey);

export default keyStore;
