/*
    Nabeel Ansari
    8-6-2014
    chord-app: JavaScript app to detect multiple pitchces using HTML5 audio. Requires dsp.js and 
               mus_math.js to already be imported.

    Allow me to explain the underlying theory of this application. I'm essentially creating
    polyphonic pitch detection out of spectral calculation. I use the Web Audio API in these 
    steps:
        -Input Audio (built-in)
        -Anti-aliasing Filter (built-in)
        -Downsampling
        -Spectral Computation (built-in)
    
    The anti-aliasing filter and downsampling go hand in hand. We want to downsample because when we
    downsample, your highest representable frequency, called the nyquist, lowers. For this app, we only care
    about notes up to C7 (a reasonable stopping point for detecting chord tones), so we lower the nyquist
    from 22050Hz (the nyquist of 44.1KHz sampling) to an integer multiple that can fit up to C7. Why not just
    filter, you might ask? Filtering would certainly eliminate the effect of high frequencies on the chords.

    With an FFT, the bin width has direct correlation to sampling rate, so when we have smaller sampling 
    rates, we have a smaller bin width (essentially, our frequency resolution increases). However,
    any frequencies under the original nyquist but over the new nyquist will have effects on the signal 
    that persist through the downsampling. Since these frequencies can not be represented properly, 
    they essentially corrupt the signal, having effects on it without being correctly accounted for 
    in an Fast Fourier Transform. The solution is simple; apply a low pass filter before the downsampling
    to remove the effect of those frequencies in the signal. The cutoff should be inuitively the new
    nyquist. After downsampling, we are not accumulating any extra unwanted aliasing.

    If we downsample by a factor of 10 (given 44100 KHz audio), our nyquist is 2205 Hz, just above C7.
    When we take a 2048 point FFT, our bin width is Fs/N = 4410/2048 = 2.15Hz. This means that each bin
    captures +/- 1.075 Hz of frequency energy around its center frequency, which is simply n/N * nyquist.
    Distance between notes down to C2 is around 4Hz, so this resolution is more than enough. The actual
    downsampling process is simple; just create a new signal with every 10th sample.

    After acquiring the spectral data, we then locate all of the note bins. Refer to the mus_math.js file
    to see how I do this. I linearly space each note bin for the visualizer and pass off a list of the note
    frequencies and amplitudes to a voice extracting algorithm. It locates the top v voices where v is a 
    small integer specified by the user. The app then displays the returned list of voices at the bottom of
    the visualizer.
*/

/**********************************************************************************************/
/*  Set up the app.                                                                           */
/**********************************************************************************************/
var cvs, ctx, actx = new AudioContext();
var audioBuffer;
var sourceNode, aaf, DSNode, fdomain;
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
    spectrum = new Float32Array(NSPC),          //Output of Analyser Node
    peaks = new Float32Array(NSPC),             //Absolute value, inversion of Analyser Node

    octaves = 5,                                //How many octaves to account for
    noteBins = octaves*12+2,                    //How many note bins to draw.
    n_stride,                                   //The static pixel distance between notes.
    f_low = getFreq("C", 7-octaves),            //Frequency of lowest note allowed.
    fi_low = closestBin(f_low, NSPC, new_nyq),  //FFT Bin index of lowest note allowed.
    voices = 7,                                 //Number of voices to look for.
    extractionThreshold = .5,                   //Amplitude threshold of frequency (0 to 1)

    inputType,
    loopIntervalID;

function appLoad() 
{
    cvs = document.getElementById('canvas');
    if (cvs.getContext) 
    {
        ctx = cvs.getContext('2d');
        cvs.width = window.innerWidth*.75;
        cvs.height = window.innerHeight*.75;
        w = cvs.width;
        h = cvs.height;
        specLow = h-200;

        var grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#FF0000");
        grad.addColorStop(0.25,"#FFFF00");
        grad.addColorStop(0.5,"#00FF00");
        grad.addColorStop(0.75,"#0000FF");
        grad.addColorStop(1,"#FF00FF");
        ctx.fillStyle = grad;
        
        n_stride = w/noteBins;
    }

    if (!window.AudioContext)
        if (!window.webkitAudioContext)
            alert('No Audiocontext Found');
        else
            window.AudioContext = window.webkitAudioContext;
    
    setupAudioNodes();
}

/**********************************************************************************************/
/*  Draw the spectrum (called roughly every buffer).                                          */
/**********************************************************************************************/
function update() 
{
    ctx.clearRect(0, 0, w, h);
    fdomain.getFloatFrequencyData(spectrum);

    //Load spectrum, scale it to 1, invert.
    for(var i = 0; i < NSPC; i++) 
        peaks[i] = Math.abs(spectrum[i]);
    scale(peaks);
    invert(peaks);

    //Extract the notes.
    var notes = [];
    for(var fi = fi_low; fi < NSPC; fi++) 
    {
        f = (fi/NSPC)*new_nyq;
        if(whatNote(f, binw/2) != "Z") //If the bin captures a note, push it into the voice queue.
        {
            voice = {freq:f, amp:peaks[fi]};
            notes.push(voice);
        }
    }   
    //Extract the voices
    topv = extractTopVoices(notes, voices, extractionThreshold).sort(function(a,b){ return a.freq-b.freq; });
    V = topv.length;

    //Draw spectrum.
    ctx.font = "10px Arial";    
    for(var n = 0; n < notes.length; n++) 
    {
        px = n*n_stride;
        ctx.fillRect(px, 30, 12, h*notes[n].amp);
        nText = whatNote(notes[n].freq, binw/2);
        if(nText.length == 1)
            ctx.fillText(whatNote(notes[n].freq, binw/2), px, 20);
        else
            ctx.fillText(whatNote(notes[n].freq, binw/2), px-3, 20);  
    }

    ctx.font = "40px Arial";
    for(var v = 0; v < V; v++)
        ctx.fillText(whatNote(topv[v].freq, binw/2), w*(.75+2*v)/(2*V), h-50);
}

//Extracts top voices above a threshold. nVoices is the maximum number of voices to search for.
function extractTopVoices(input, max_N, threshold) 
{
    var voiceQueue=[];
    for(var i = 0; i < max_N; i++) 
    {
        v = {bin:0, amp:0};
        voiceQueue.push(v);
    }

    for(var i = 1; i < input.length - 1; i++) 
    {
        if(input[i].amp > threshold)
            if(input[i].amp - input[i-1].amp > 0 & input[i].amp - input[i+1].amp > 0) 
            {
                if(input[i].amp > voiceQueue[0].amp)
                    voiceQueue[0] = input[i];
                voiceQueue.sort(function(a,b) { return a.amp-b.amp; });
            }
    }
    return voiceQueue;
}
//Returns the voice index in the voice queue that is a duplicate, or a -1 if there are none.
function findDuplicate(voice, queue) 
{
    for(var i = 0; i < queue.length; i++) 
        if(whatNote(voice.freq, binw/2) == whatNote(queue[i].freq, binw/2))
            return i;
    return -1;
}


/**********************************************************************************************/
/*  Initialization functions.                                                                 */
/**********************************************************************************************/
function setupAudioNodes() 
{
    //Create an anti-aliasing filter for the downsampling
    aaf = actx.createBiquadFilter();
    aaf.type = aaf.LOWPASS;
    aaf.frequency.value = new_nyq;
    
    //Create the downsample node.
    DSNode = actx.createScriptProcessor(N, 1, 1);
    DSNode.onaudioprocess = function(e) 
    {
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        downsample(input, output, fs_k);
        hann(output, ds_N); 
    }

    //Create the FFT Node.
    fdomain = actx.createAnalyser();
    fdomain.fftSize = NFFT;
    fdomain.smoothingTimeConstant = 0.9;
    
    //Connect the Nodes.
    aaf.connect(DSNode);
    DSNode.connect(fdomain);
}

function loadFile(URL, player)
{   
    HTMLAudio = player;
    HTMLAudio.src = URL;

    sourceNode = actx.createMediaElementSource(HTMLAudio);  
    sourceNode.loop = true;
    sourceNode.connect(aaf);
    sourceNode.connect(actx.destination);
}

// success callback when requesting audio input stream
function micStream(stream) 
{
    // Create an AudioNode from the stream.
    sourceNode = actx.createMediaStreamSource(stream);
    sourceNode.connect(aaf);
    sourceNode.connect(actx.destination);
    analyserStart();
}

function analyserStart() { loopIntervalID = setInterval(update, 1000/(fs/N)); }
function analyserPause() { clearInterval(loopIntervalID); }