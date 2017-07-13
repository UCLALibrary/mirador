# [Mirador](http://projectmirador.org/) &middot; [![Build status](https://travis-ci.org/ProjectMirador/mirador.svg?branch=master)](https://travis-ci.org/ProjectMirador/mirador?branch=master) [![Coverage status](https://coveralls.io/repos/github/ProjectMirador/mirador/badge.svg?branch=master&upToDate=true)](https://coveralls.io/github/ProjectMirador/mirador?branch=master&upToDate=true) [![Waffle.io stories in ready](https://img.shields.io/waffle/label/ProjectMirador/mirador/ready.svg)](http://waffle.io/iiif/mirador)

![mirador banner](http://projectmirador.github.io/mirador/img/banner.jpg)
Mirador is a configurable, extensible, and easy-to-integrate image viewer, which enables image annotation and comparison of images from repositories dispersed around the world. Mirador has been optimized to display resources from repositories that support the [International Image Interoperability Framework](http://iiif.io) (IIIF) APIs. It provides a tiling windowed environment for comparing multiple image-based resources, synchronized structural and visual navigation of content using [OpenSeadragon](https://openseadragon.github.io), [OpenAnnotation](http://www.openannotation.org)-compliant annotation creation and viewing on deep-zoomable canvases, metadata display, book reading, bookmarking and more.

See a live demo here: http://projectmirador.org/demo.

## Installation

You can find the latest release [here](https://github.com/ProjectMirador/mirador/releases/latest). For configuration details and examples, see the [Getting Started guide](http://projectmirador.org/docs/docs/getting-started.html).

## Development Environment Setup

Mirador uses [Node](http://nodejs.org/) and [Grunt](https://gruntjs.com/) to assemble, test, and manage the development resources. If you have never used these tools before, you'll need to install them before proceeding.

Once that's done, clone the repository and do the following to start up a local development server:

```bash
cd mirador
npm install
npm start
```
 
To run the automated tests:

```bash
npm test
```

## Contributing

See [this guide](CONTRIBUTING.md) for more information.

## Help

For additional help, see the [docs](http://projectmirador.org/docs/docs/index.html), submit an [issue](https://github.com/projectmirador/mirador/issues), or ask a question in the `mirador` channel in the [IIIF Slack](http://bit.ly/iiif-slack).
