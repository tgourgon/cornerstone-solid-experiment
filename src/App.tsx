import type { Component } from 'solid-js';
import { createSignal, onMount, For } from "solid-js";

import {
  Enums,
  RenderingEngine,
  imageLoader,
  metaData,
  init as csinit,
  StackViewport
} from "@cornerstonejs/core";

import {
  IImage,
  ImageLoaderFn,
  PublicViewportInput
} from '@cornerstonejs/core/dist/types/types';

//16bit unsigned  little endian
//width 2560 Height 3272
const rows = 3072;
const colums = 2560;

// Add hardcoded meta data provider for color images
function hardcodedMetaDataProvider(type: string, imageId: string, imageIds: string) {
  const colonIndex = imageId.indexOf(':');
  const scheme = imageId.substring(0, colonIndex);
  if (scheme !== 'custom1') {
    return;
  }

  if (type === 'imagePixelModule') {
    const imagePixelModule = {
      pixelRepresentation: 0,
      bitsAllocated: 16,
      bitsStored: 16,
      highBit: 16,
      photometricInterpretation: 'Monochrome1',
      samplesPerPixel: 1,
    };

    return imagePixelModule;
  } else if (type === 'generalSeriesModule') {
    const generalSeriesModule = {
      modality: 'DR',
      seriesNumber: 1,
      seriesDescription: 'n/a',
      seriesDate: '20190201',
      seriesTime: '120000',
      seriesInstanceUID: '1.2.276.0.7230010.3.1.4.83233.20190201120000.1',
    };

    return generalSeriesModule;
  } else if (type === 'imagePlaneModule') {
    const index = imageIds.indexOf(imageId);
    // console.warn(index);
    const imagePlaneModule = {
      imageOrientationPatient: [1, 0, 0, 0, 1, 0],
      imagePositionPatient: [0, 0, index * 5],
      pixelSpacing: [1, 1],
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      frameOfReferenceUID: 'FORUID',
      columns: colums,
      rows: rows,
      rowCosines: [1, 0, 0],
      columnCosines: [0, 1, 0],
    };

    return imagePlaneModule;
  } else if (type === 'voiLutModule') {
    return {
      // According to the DICOM standard, the width is the number of samples
      // in the input, so 256 samples.
      windowWidth: [65535],
      // The center is offset by 0.5 to allow for an integer value for even
      // sample counts
      windowCenter: [65535 / 2],
    };
  } else if (type === 'modalityLutModule') {
    return {
      rescaleSlope: 1,
      rescaleIntercept: 0,
    };
  } else {
    return undefined;
  }
}

function loadImage(imageId: string): Promise<ImageLoaderFn> {
  // Parse the imageId and return a usable URL (logic omitted)
  // const url = parseImageId(imageId);
  const url = "http://localhost:3000/samples/sample_1.aof";

  // Create a new Promise
  const promise = new Promise((resolve, reject) => {
    // Inside the Promise Constructor, make
    // the request for the DICOM data
    const oReq = new XMLHttpRequest();
    oReq.open('get', url, true);
    oReq.responseType = 'arraybuffer';
    oReq.onreadystatechange = function (oEvent) {
      if (oReq.readyState === 4) {
        if (oReq.status == 200) {
          // Request succeeded, Create an image object (logic omitted)
          //const image = createImageObject(oReq.response);
          console.log(oReq);
          const image: IImage = {
            imageId: "sample",
            minPixelValue: 0,
            maxPixelValue: 65535,
            windowCenter: 65535 / 2,
            windowWidth: 65535,
            slope: 1,
            intercept: 0,
            rows: rows,
            columns: colums,
            color: false,
            columnPixelSpacing: 140,
            height: rows,
            invert: false,
            numComps: 1,
            rgba: false,
            rowPixelSpacing: 140,
            sizeInBytes: 2 * rows * colums,
            width: colums,
            getPixelData: () => { return oReq.response },
            getCanvas: () => document.createElement("canvas"),
            voiLUTFunction: ""
          };
          // Return the image object by resolving the Promise
          resolve(image);
        } else {
          // An error occurred, return an object containing the error by
          // rejecting the Promise
          reject(new Error(oReq.statusText));
        }
      }
    };

    oReq.send();
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return({
    promise,
  });
}

const App: Component = () => {

  let csDiv: HTMLDivElement;

  onMount(async () => {
    const cs = await csinit();
    imageLoader.registerImageLoader('custom1', loadImage);

    metaData.addProvider(
      // @ts-ignore
      (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageIds),
      10000
    );


    csDiv.style.width = `${colums}}px`;
    csDiv.style.height = `${rows}px`;

    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new RenderingEngine(renderingEngineId);

    const viewportId = 'STACK';

    const viewportInput: PublicViewportInput = {
      element: csDiv,
      viewportId: viewportId,
      type: Enums.ViewportType.STACK
    };

    renderingEngine.enableElement(viewportInput);

    const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
    await viewport.setStack(['custom1://example.com/image.dcm']);
    viewport.render();


  });

  return (
    <>
      <h1> Hello cornerstone</h1>
      <div ref={csDiv} id='content'></div>
    </>
  );
};

export default App;
