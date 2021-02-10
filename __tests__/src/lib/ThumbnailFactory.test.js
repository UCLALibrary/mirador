import { Canvas, Resource, Utils } from 'manifesto.js/dist-esmodule';
import getThumbnail from '../../../src/lib/ThumbnailFactory';
import fixture from '../../fixtures/version-2/019.json';

const manifest = Utils.parseManifest(fixture);
const canvas = manifest.getSequences()[0].getCanvases()[0];

describe('getThumbnail', () => {
  const url = 'http://example.com';
  const iiifLevel0Service = { id: url, profile: 'level0', type: 'ImageService3' };
  const iiifLevel1Service = { id: url, profile: 'level1', type: 'ImageService3' };
  const iiifLevel2Service = { id: url, profile: 'level2', type: 'ImageService3' };

  describe('with a thumbnail', () => {
    it('return the thumbnail and metadata', () => {
      const myCanvas = new Canvas({ '@id': 'xyz', '@type': 'Whatever', thumbnail: { '@id': url, height: 70, width: 50 } });
      expect(getThumbnail(myCanvas)).toEqual({ height: 70, url, width: 50 });
    });

    it('return the IIIF service of the thumbnail', () => {
      const myCanvas = new Canvas({
        '@id': 'xyz',
        '@type': 'Whatever',
        thumbnail: {
          height: 2000,
          id: 'arbitrary-url',
          service: [iiifLevel1Service],
          width: 1000,
        },
      });
      expect(getThumbnail(myCanvas)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
    });

    describe('with image size constraints', () => {
      it('does nothing with a static resource', () => {
        const myCanvas = new Canvas({ '@id': 'xyz', '@type': 'Whatever', thumbnail: { '@id': url } });
        expect(getThumbnail(myCanvas, { maxWidth: 50 })).toEqual({ url });
      });

      it('does nothing with a IIIF level 0 service', () => {
        const myCanvas = new Canvas({ '@id': 'xyz', '@type': 'Whatever', thumbnail: { id: 'arbitrary-url', service: [iiifLevel0Service] } });
        expect(getThumbnail(myCanvas, { maxWidth: 50 })).toEqual({ url: 'arbitrary-url' });
      });

      it('calculates constraints for a IIIF level 1 service', () => {
        const myCanvas = new Canvas({
          '@id': 'xyz',
          '@type': 'Whatever',
          thumbnail: {
            height: 2000,
            id: 'arbitrary-url',
            service: [iiifLevel1Service],
            width: 1000,
          },
        });
        expect(getThumbnail(myCanvas, { maxWidth: 150 })).toEqual({ height: 300, url: `${url}/full/150,/0/default.jpg`, width: 150 });
      });

      it('calculates constraints for a IIIF level 2 service', () => {
        const myCanvas = new Canvas({
          '@id': 'xyz',
          '@type': 'Whatever',
          thumbnail: {
            height: 2000,
            id: 'arbitrary-url',
            service: [iiifLevel2Service],
            width: 1000,
          },
        });
        expect(getThumbnail(myCanvas, { maxHeight: 200, maxWidth: 150 })).toEqual({ height: 200, url: `${url}/full/!150,200/0/default.jpg`, width: 100 });
      });

      it('applies a minumum size to image constraints to encourage asset reuse', () => {
        const myCanvas = new Canvas({
          '@id': 'xyz',
          '@type': 'Whatever',
          thumbnail: {
            height: 2000,
            id: 'arbitrary-url',
            service: [iiifLevel2Service],
            width: 1000,
          },
        });
        expect(getThumbnail(myCanvas, { maxHeight: 100, maxWidth: 100 })).toEqual({ height: 120, url: `${url}/full/!120,120/0/default.jpg`, width: 60 });
      });
    });
  });

  describe('with an image resource', () => {
    describe('without a IIIF service', () => {
      it('uses the thumbnail', () => {
        const myImage = new Resource({ '@id': 'xyz', '@type': 'Image', thumbnail: { '@id': url, height: 70, width: 50 } });
        expect(getThumbnail(myImage)).toEqual({ height: 70, url, width: 50 });
      });
    });

    describe('with a level 0 IIIF service', () => {
      it('returns the image', () => {
        const myImage = new Resource({
          id: 'xyz',
          service: [iiifLevel0Service],
          type: 'Image',
        });
        expect(getThumbnail(myImage)).toEqual({ url: 'xyz' });
      });

      it('uses embedded sizes to find an appropriate size', () => {
        const myImage = new Resource({
          id: 'xyz',
          service: [{
            ...iiifLevel0Service,
            sizes: [
              { height: 25, width: 25 },
              { height: 100, width: 100 },
              { height: 125, width: 125 },
              { height: 1000, width: 1000 },
            ],
          }],
          type: 'Image',
        });
        expect(getThumbnail(myImage, { maxHeight: 120, maxWidth: 120 }))
          .toEqual({ height: 125, url: `${url}/full/125,125/0/default.jpg`, width: 125 });
      });
    });

    describe('with a IIIF service', () => {
      it('prefers the image service over a non-IIIF thumbnail', () => {
        const myImage = new Resource({
          height: 2000,
          id: 'xyz',
          service: [iiifLevel1Service],
          thumbnail: { '@id': 'some-url', height: 70, width: 50 },
          type: 'Image',
          width: 1000,
        });
        expect(getThumbnail(myImage)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
      });
      it('prefers a IIIF thumbnail over the image service', () => {
        const myImage = new Resource({
          id: 'xyz',
          service: [{
            ...iiifLevel1Service,
            id: 'some-url',
          }],
          thumbnail: {
            height: 2000,
            id: 'arbitrary-url',
            service: [iiifLevel1Service],
            width: 1000,
          },
          type: 'Image',
        });
        expect(getThumbnail(myImage)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
      });
    });
  });

  describe('with a canvas', () => {
    it('uses the thumbnail', () => {
      const myCanvas = new Canvas({
        ...canvas.__jsonld,
        thumbnail: {
          height: 2000,
          id: 'arbitrary-url',
          service: [iiifLevel1Service],
          width: 1000,
        },
      });
      expect(getThumbnail(myCanvas)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
    });

    it('uses the first image resource', () => {
      expect(getThumbnail(canvas)).toEqual({ height: 120, url: 'https://stacks.stanford.edu/image/iiif/hg676jb4964%2F0380_796-44/full/,120/0/default.jpg', width: 170 });
    });
  });

  describe('with a manifest', () => {
    it('uses the thumbnail', () => {
      const manifestWithThumbnail = Utils.parseManifest({
        ...manifest.__jsonld,
        thumbnail: {
          height: 2000,
          id: 'arbitrary-url',
          service: [iiifLevel1Service],
          width: 1000,
        },
      });

      expect(getThumbnail(manifestWithThumbnail)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
    });

    it('uses the startCanvas', () => {
      const manifestWithStartCanvas = Utils.parseManifest({ ...manifest.__jsonld, start: { id: 'https://purl.stanford.edu/fr426cg9537/iiif/canvas/fr426cg9537_1' } });
      expect(getThumbnail(manifestWithStartCanvas)).toEqual({ height: 120, url: 'https://stacks.stanford.edu/image/iiif/fr426cg9537%2FSC1094_s3_b14_f17_Cats_1976_0005/full/,120/0/default.jpg', width: 176 });
    });

    it('uses the first canvas', () => {
      expect(getThumbnail(manifest)).toEqual({ height: 120, url: 'https://stacks.stanford.edu/image/iiif/hg676jb4964%2F0380_796-44/full/,120/0/default.jpg', width: 170 });
    });
  });

  describe('with a collection', () => {
    it('uses the thumbnail', () => {
      const collection = Utils.parseManifest({
        items: [
          {
            id: 'https://example.org/iiif/1/manifest',
            label: { en: ['Example Manifest 1'] },
            thumbnail: [
              {
                format: 'image/jpeg',
                id: 'https://example.org/manifest1/thumbnail.jpg',
                type: 'Image',
              },
            ],
            type: 'Manifest',
          },
        ],
        thumbnail: {
          height: 2000,
          id: 'arbitrary-url',
          service: [iiifLevel1Service],
          width: 1000,
        },
        type: 'Collection',
      });
      expect(getThumbnail(collection)).toEqual({ height: 120, url: `${url}/full/,120/0/default.jpg`, width: 60 });
    });

    it('uses the first manifest', () => {
      const collection = Utils.parseManifest({
        items: [
          {
            id: 'https://example.org/iiif/1/manifest',
            label: { en: ['Example Manifest 1'] },
            thumbnail: [
              {
                format: 'image/jpeg',
                id: 'https://example.org/manifest1/thumbnail.jpg',
                type: 'Image',
              },
            ],
            type: 'Manifest',
          },
        ],
        type: 'Collection',
      });
      expect(getThumbnail(collection)).toEqual({ url: 'https://example.org/manifest1/thumbnail.jpg' });
    });
  });
});
