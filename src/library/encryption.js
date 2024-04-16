const CryptoJS = require('crypto-js')

const encode = (body) => {
    const encrypt = CryptoJS.AES.encrypt(JSON.stringify(body), process.env.ENCRYPT_KEY).toString()
    return encrypt
}

const decode = (body) => {
    const decrypt = CryptoJS.AES.decrypt(body, process.env.ENCRYPT_KEY)
    const decryptObj = JSON.parse(decrypt.toString(CryptoJS.enc.Utf8));
    return decryptObj
}

const decrypt = (body) => {
    return decode(body.body.edc)
}

const encrypt = (body) => {
    const result = encode(body)
    return {edc: result}
}

module.exports = {encrypt, decrypt} 