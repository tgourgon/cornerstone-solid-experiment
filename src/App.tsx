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
  }else if (type === 'generalSeriesModule') {
    const generalSeriesModule = {
      modality: 'CR',
      seriesNumber: 1,
      seriesDescription: 'N/A',
      seriesDate: '20190201',
      seriesTime: '120000',
      seriesInstanceUID: '1.2.276.0.7230010.3.1.4.83233.20190201120000.1',
    };

    return generalSeriesModule;
  }else if (type === 'imagePlaneModule') {
    //const index = imageIds.indexOf(imageId);
    // console.warn(index);
    const imagePlaneModule = {
      imageOrientationPatient: [1, 0, 0, 0, 1, 0],
      //imagePositionPatient: [0, 0, index * 5],
      imagePositionPatient: [0, 0, 0],
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
  }  else if (type === 'voiLutModule') {
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
  const url = "http://localhost:3000/samples/sample_5.aof";

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
            getPixelData: () => { 
              console.log("Get Pixel Data was called ");
              let targetArray = new Uint16Array(oReq.response);
              console.log(`PixelData ByteLength ${targetArray.byteLength} length ${targetArray.length}`);
              return targetArray;
            },
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

  //let csDiv: HTMLDivElement = document.getElementById("content") as HTMLDivElement;
  //let csDiv = document.createElement('div');
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
    csDiv.style.width = `800px`;
    csDiv.style.height = `800px`;

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
    // await viewport.loadImages(['custom1://example.com/image.dcm'],{
    //   successCallback: (imageId, image) => {console.log(`Success Callback ${imageId}`);},
    //   errorCallback: (imageId, permanent, reason) => {console.log(`Error Callback ${imageId}, ${permanent}, ${reason}`);}
    // });
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
