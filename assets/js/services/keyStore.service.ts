import RequestKeyService from "./requestKey.service";
import * as keyStore from "../crypto/keyStore.js";

keyStore.upload.setKeyGet(RequestKeyService.getKey);

export default keyStore;
