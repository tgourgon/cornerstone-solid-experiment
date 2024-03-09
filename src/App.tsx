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
  PublicViewportInput
} from '@cornerstonejs/core/dist/types/types';

// The sample image (.aof) files are raw 16bit unsigned little endian encoded images
// with width=2560 and Height=3272
const rows = 3072;
const colums = 2560;

// Add hardcoded meta data provider for color images
function hardcodedMetaDataProvider(type: string, imageId: string) {
  const colonIndex = imageId.indexOf(':');
  const scheme = imageId.substring(0, colonIndex);
  if (scheme !== 'custom1') {
    return;
  }

  console.log(`Getting Metadata ${type} for ${imageId}`);
  if (type === 'imagePixelModule') {
    const imagePixelModule = {
      pixelRepresentation: 0, // 0 for unsigned 
      bitsAllocated: 16,
      bitsStored: 16,
      highBit: 16,
      photometricInterpretation: "MONOCHROME1",
      samplesPerPixel: 1,
    };

    return imagePixelModule;
  } else if (type === 'voiLutModule') {
    return {
      windowWidth: [65535],
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

function loadImage(imageId: string): { promise: Promise<IImage> } {

  //TODO Parse ImageId to extrack URL
  const url = "http://localhost:3000/samples/sample_1.aof";

  // Create a new Promise
  const promise = new Promise<IImage>((resolve, reject) => {
    const oReq = new XMLHttpRequest();
    oReq.open('get', url, true);
    oReq.responseType = 'arraybuffer';
    oReq.onreadystatechange = function (oEvent) {
      if (oReq.readyState === 4) {
        if (oReq.status == 200) {
          console.log(oReq);
          const image: IImage = {
            imageId: imageId,
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
            voiLUTFunction: Enums.VOILUTFunctionType.LINEAR
          };
          console.log("Returning image object");
          console.log(image);
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
  return ({
    promise,
  });
}

const App: Component = () => {

  let csDiv: HTMLDivElement;

  onMount(async () => {
    const cs = await csinit();
    imageLoader.registerImageLoader('custom1', loadImage);

    metaData.addProvider(
      (type, imageId) => hardcodedMetaDataProvider(type, imageId),
      10000
    );


    // csDiv.style.width = `${colums}}px`;
    // csDiv.style.height = `${rows}px`;
    csDiv.style.width = `500px`;
    csDiv.style.height = `500px`;

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
      <h1>Cornerstone3D Raw Image Viewer</h1>
      <div ref={csDiv} id='content'></div>
    </>
  );
};

export default App;
