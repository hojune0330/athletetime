const assert = require('node:assert/strict');
const test = require('node:test');

const cloudinary = require('cloudinary').v2;
const dependencyManifest = require('../../package.json');
const utilityPath = require.resolve('../utils/cloudinary');

function loadUtilityWithUploader({ uploadStream, destroy }) {
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;

  cloudinary.uploader.upload_stream = uploadStream;
  cloudinary.uploader.destroy = destroy;
  delete require.cache[utilityPath];

  return {
    utility: require('../utils/cloudinary'),
    restore() {
      delete require.cache[utilityPath];
      cloudinary.uploader.upload_stream = originalUploadStream;
      cloudinary.uploader.destroy = originalDestroy;
    },
  };
}

test('Cloudinary uses the supported v2 dependency line', () => {
  assert.equal(dependencyManifest.dependencies.cloudinary, '^2.10.0');
});

test('image upload preserves the buffer and Cloudinary options', async () => {
  const image = Buffer.from('athletetime-image');
  const options = { folder: 'marketplace', resource_type: 'image' };
  let receivedOptions;
  let receivedBuffer;

  const harness = loadUtilityWithUploader({
    uploadStream(nextOptions, callback) {
      receivedOptions = nextOptions;
      return {
        end(buffer) {
          receivedBuffer = buffer;
          callback(null, { public_id: 'marketplace/image', secure_url: 'https://example.test/image' });
        },
      };
    },
    destroy() {
      throw new Error('delete should not be called during upload');
    },
  });

  try {
    const result = await harness.utility.uploadToCloudinary(image, options);

    assert.deepEqual(receivedOptions, options);
    assert.equal(receivedBuffer, image);
    assert.equal(result.public_id, 'marketplace/image');
  } finally {
    harness.restore();
  }
});

test('image deletion forwards the public ID and returns provider result', async () => {
  let receivedPublicId;
  const harness = loadUtilityWithUploader({
    uploadStream() {
      throw new Error('upload should not be called during deletion');
    },
    async destroy(publicId) {
      receivedPublicId = publicId;
      return { result: 'ok' };
    },
  });

  try {
    const result = await harness.utility.deleteFromCloudinary('marketplace/image');

    assert.equal(receivedPublicId, 'marketplace/image');
    assert.deepEqual(result, { result: 'ok' });
  } finally {
    harness.restore();
  }
});
