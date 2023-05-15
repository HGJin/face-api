const imageUpload = document.getElementById('imageUpload');

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(start);

async function start() {
  const container = document.createElement('div');
  container.style.position = 'relative';
  document.body.append(container);
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.7);
  let image;
  let canvas;
  document.body.append('데이터 로딩 완료');
  imageUpload.addEventListener('change', async () => {
    if (image) image.remove();
    if (canvas) canvas.remove();
    image = await faceapi.bufferToImage(imageUpload.files[0]);
    container.append(image);
    canvas = faceapi.createCanvasFromMedia(image);
    container.append(canvas);
    const displaySize = { width: image.width, height: image.height };
    faceapi.matchDimensions(canvas, displaySize);
    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    const outputData = [['출석부'], ['이름', '정확도', '출석 여부']];
    const names = labeledFaceDescriptors.map(lfd => lfd.label);
    const resultObj = {};
    
    names.forEach(name => {
      resultObj[name] = {
        accuracy: 0,
        status: '미출석',
      };
    });
    
    resizedDetections.forEach((detection, i) => {
      const descriptor = detection.descriptor;
      const bestMatch = faceMatcher.findBestMatch(descriptor);
      const label = bestMatch.label;
      const accuracy = bestMatch.distance;
      const status = accuracy >= 0.3 ? '출석완료' : '미출석';
      
      if (accuracy > resultObj[label].accuracy) {
        resultObj[label].accuracy = accuracy;
        resultObj[label].status = status;
      }
    });
    
    names.forEach(name => {
      const accuracy = resultObj[name].accuracy;
      const status = resultObj[name].status;
      outputData.push([name, accuracy, status]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(outputData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '출석부');
    XLSX.writeFile(wb, '출석부.xlsx');
  });
}

function loadLabeledImages() {
  const labels = ['Haha','Jaesuk', 'Jihyo', 'Jongkuk', 'Sechan', 'Somin', 'Sukjin'];
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 3; i++) {
        const img = await faceapi.fetchImage(`https://raw.githubusercontent.com/HGJin/face-api/main/face/${label}/${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
