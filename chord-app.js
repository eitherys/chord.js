//  Nabeel Ansari
//  8-6-2014
//  chord-app: JavaScript app to detect chords using HTML5 audio. Requires dsp.js and mus_math.js 
//             to already be imported.

/**********************************************************************************************/
/*  Set up the app.                                                                           */
/**********************************************************************************************/
var cvs, ctx, actx = new AudioContext();
var audioBuffer;
var sourceNode, DSNode, fftNode, aaFilter;
var w, h;
var specLow;

var fs = 44100,                                 //Original sampling rate.
    nyq = fs/2,
    fs_k = 10, 
    new_fs = fs/fs_k, 
    new_nyq = new_fs/2,                         //New sampling rate, integer factor down.
    
    NFFT = 2048,                                //Number of desired points in FFT.
    NSPC = NFFT/2,                              //Number of usable points in the FFT.
    N = NFFT,                                   //Size of the Web Audio buffers.
    ds_N = Math.floor(N / fs_k),                //Size of downsampled input buffer.
    binw = new_fs/NFFT,                         //The FFT bin width.
    spectrum = new Float32Array(NSPC),
    peaks = new Float32Array(NSPC),

    octaves = 5,    
    noteBins = octaves*12+2,                    //How many note bins to draw.
    n_stride,                                   //The static pixel distance between notes.
    b_stride,                                   //The dynamic pixel distance between FFT bins.
    f_low = getFreq("C", 7-octaves),            //Frequency of lowest note allowed.
    fi_low = closestBin(f_low, NSPC, new_nyq);  //FFT Bin index of lowest note allowed.

function appLoad() {
    cvs = document.getElementById('canvas');
    if (cvs.getContext) {
        ctx = cvs.getContext('2d');
        cvs.width = window.innerWidth*.75;
        cvs.height = window.innerHeight;
        w=cvs.width;
        h=cvs.height;
        specLow=h-200;

        var grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#FF0000");
        grad.addColorStop(0.25,"#FFFF00");
        grad.addColorStop(0.5,"#00FF00");
        grad.addColorStop(0.75,"#0000FF");
        grad.addColorStop(1,"#FF00FF");
        ctx.fillStyle = grad;
        ctx.font = "15px Arial";
        
        n_stride = w/noteBins;
    }

    if (!window.AudioContext) {
        if (!window.webkitAudioContext)
            alert('No Audiocontext Found');
        else
            window.AudioContext = window.webkitAudioContext;
    }
    
    setupAudioNodes();
    loadSound("https://dl.dropboxusercontent.com/u/15510436/File%20Sharing/To%20Zanarkand.wav");

    requestAnimationFrame(update);
}

/**********************************************************************************************/
/*  Draw the spectrum (called every animation frame).                                         */
/**********************************************************************************************/
function update() {
    fftNode.getFloatFrequencyData(spectrum);

    //Load the spectrum into the peaks array.
    var max = 0;
    for(var i = 0; i < NSPC; i++) {
        peaks[i] = Math.pow(spectrum[i], 2);
        if(peaks[i] > max) 
            max = peaks[i];
    }

    //Scale the peaks to the height of the canvas. Since the spectrum is upside-down, must take
    //1-peaks[i]/max instead of peaks[i]/max. 
    for(var i = 0; i < NSPC; i++) {
        peaks[i] = h*(1-peaks[i]/max);
    }

    //Set up parameters for traversing the spectrum.
    var note = 0;                                           //The number of note bins encountered.
    var fi = fi_low, px = 0;                                //FFT Bin index and pixel x-coordinate.
    var n = "Z";                                            //The note of the frequency bin.
    var fin1 = fi_low;                                      //Left note bin.
    var fin2 = closestBin(nextNoteF(f_low), NSPC, new_nyq);  //Right note bin.
    b_stride = n_stride/(fin2-fin1);                  
    
    notePeaks=[];

    //Begin drawing.
    ctx.clearRect(0, 0, w, h);
    while(fi < NSPC) {
        f = (fi/NSPC)*new_nyq;
        px += b_stride;
        n = whatNote(f, binw/2);

        if(n != "Z") {
            voice = {freq:f, amp:peaks[fi]};
            notePeaks.push(voice);

		    ctx.fillRect(px, 0, 2, peaks[fi]);
            ctx.fillText(n, px-4, peaks[fi]+25);
        }
        if(fi == fin2) {
            fin1 = fi;
            fin2 = closestBin(nextNoteF(f), NSPC, new_nyq);
            b_stride = n_stride/(fin2-fin1);
            note++;
        }

        fi++;
    }

    topv = extractTopVoices(notePeaks, 5);
    for(var v = 0; v < topv.length; v++) {
        ctx.fillText(whatNote(topv[v].freq, binw/2), v/topv.length*w, specLow);
    }

    //Call again when frame is ready.
    requestAnimationFrame(update);
}

function extractTopVoices(input, numVoices) {
    var voiceQueue=[];
    for(var i = 0; i < numVoices; i++) {
        v = {bin:0, amp:0};
        voiceQueue.push(v);
    }

    for(var i = 1; i < input.length - 1; i++) {
        if(input[i].amp > voiceQueue[0].amp) {
            voiceQueue[0] = input[i];
            voiceQueue.sort(function(a,b) { 
                                return a.amp-b.amp; 
                            });
        }
    }
    return voiceQueue;
}


/**********************************************************************************************/
/*  Initialization functions.                                                                 */
/**********************************************************************************************/
function setupAudioNodes() {
    sourceNode = actx.createBufferSource();

    //Create an anti-aliasing filter for the downsampling
    aaf = actx.createBiquadFilter();
    aaf.type = aaf.LOWPASS;
    aaf.frequency.value = new_nyq;
    
    //Create the downsample node.
    DSNode = actx.createScriptProcessor(N, 1, 1);
    DSNode.onaudioprocess = function(e) {
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        downsample(input, output, fs_k);    
    }

    //Create the FFT Node.
    fftNode = actx.createAnalyser();
    fftNode.fftSize = NFFT;
    fftNode.smoothingTimeConstant = .8;
    
    //Connect the Nodes.
    sourceNode.connect(aaf);
    sourceNode.connect(actx.destination);
    aaf.connect(DSNode);
    DSNode.connect(fftNode);
}

//For the audio playback.
function loadSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        actx.decodeAudioData(request.response, 
                             function(buffer) { playSound(buffer); }, 
                             function(e) { console.log(e); });
    }
    request.send();
}
function playSound(buffer) {
    sourceNode.buffer = buffer;
    sourceNode.start(0);
}