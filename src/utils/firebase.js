// ------------------------------
// SAFE MOCK FIREBASE UPLOAD
// ------------------------------

console.log("⚠️ Firebase is disabled (no Firebase credentials provided).");

exports.uploadToFirebase = async (filePath) => {
  return {
    error: true,
    message: "Firebase upload disabled. Returning local file path.",
    localPath: filePath
  };
};
