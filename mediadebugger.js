/** 
 * media debugger
 * 
 * @author    Axel Hahn
 * @version   0.02
 *
 * @this mdbg
 * 
 * @example
 * <script src="../mediadebugger.js"></script>
 * <script>
 * var oDebugger=new mdbg();
 * oDebugger.init();
 * oDebugger.setOutputLogs(document.getElementById('logdata'));
 * oDebugger.setOutputEvents(document.getElementById('eventsdiv'));
 * oDebugger.attach(document.getElementById('myvideo'));
 * oDebugger.attach(document.getElementById('myaudio'));
 * </script>
 * @constructor
 * @return nothing
 */
var mdbg = function () {

    this._oDivEvents = false;  // output div for events
    this._oDivLog = false;     // output div for logs

    this._aLogs = false;       // array with log entries

    this._aMedia = [];         // array with attached media
    this._aMediaLastvar = [];  // array with attached media
    this.starttime = false;    // timestamp of start
    this.name = false;         // name of the current instance

    // evensts of audio and video tags
    this._aVartypes = {
        0: 'bool',
        1: 'integer',
        2: 'float',
        3: 'char',
        4: 'string',
        5: 'array',
        6: 'object',
        99: 'unknown'
    };

    // https://www.w3schools.com/TAGS/ref_av_dom.asp
    this._aConst = {
        'properties': {
            'audioTracks': {'type': 6},
            'autoplay': {'type': 0},
            'buffered': {'type': 6, 'readonly': true},
            'controller': {'type': 6},
            'controls': {'type': 6},
            'crossOrigin': {'type': 6},
            'currentSrc': {'type': 4},
            'currentTime': {'type': 2},
            'defaultMuted': {'type': 2},

            'networkState': {
                'type': 3,
                'values': [
                    '0 = NETWORK_EMPTY - audio/video has not yet been initialized',
                    '1 = NETWORK_IDLE - audio/video is active and has selected a resource, but is not using the network',
                    '2 = NETWORK_LOADING - browser is downloading data',
                    '3 = NETWORK_NO_SOURCE - no audio/video source found'
                ]
            },
            'readyState': {
                'values': [
                    '0 = HAVE_NOTHING - no information whether or not the audio/video is ready',
                    '1 = HAVE_METADATA - metadata for the audio/video is ready',
                    '2 = HAVE_CURRENT_DATA - data for the current playback position is available, but not enough data to play next frame/millisecond',
                    '3 = HAVE_FUTURE_DATA - data for the current and at least the next frame is available',
                    '4 = HAVE_ENOUGH_DATA - enough data available to start playing'
                ]
            }
        },
        'eventnames': [
            'abort',
            'canplay',
            'canplaythrough',
            'durationchange',
            'emptied',
            'ended',
            'error',
            'loadeddata',
            'loadedmetadata',
            'loadstart',
            'pause',
            'play',
            'playing',
            'progress',
            'ratechange',
            'seeked',
            'seeking',
            'stalled',
            'suspend',
            'timeupdate',
            'volumechange',
            'waiting'
        ]
    };

// **********************************************************************

    // ----------------------------------------------------------------------
    // private functions
    // ----------------------------------------------------------------------

    this._addSpansForEachEvent = function () {
        if (!this._oDivEvents) {
            return false;
        }
        var sHtml = '';
        for (var i = 0; i < this._aConst.eventnames.length; i++) {
            eventname = this._aConst.eventnames[i];
            sHtml += '<span id="span-' + eventname + '" class="event">' + eventname + '</span> ';
        }
        this._oDivEvents.innerHTML = sHtml + '<div style="clear: both;"></div>';

    };


    this._attachEachEvent = function (iMediaId) {
        if (!this._aMedia.length || iMediaId > this._aMedia.length) {
            console.log('ERROR in _attachEachEvent: media id ' + iMediaId + ' is wrong: no media or id larger than count.');
            return false;
        }
        var selfobject = this;
        for (var i = 0; i < this._aConst.eventnames.length; i++) {
            var eventname = this._aConst.eventnames[i];

            this._aMedia[iMediaId].addEventListener(eventname, function (event) {
                selfobject.fireListener(event, iMediaId);
            });
        }
        this.log('info', 'debugger', 'events were added to media'+iMediaId);
    };

    this._microtime = function (get_as_float) {
        var now = new Date().getTime() / 1000;
        var s = parseInt(now);
        return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
    };

    /**
     * internal helper function - called in init()
     * it detects the name of the ocject variable that initialized the player
     * i.e. on var oMcPlayer=new mcPlayer();
     * it returns "oMcPlayer"
     * 
     * @private
     * @returns {string}
     */
    this._getName = function () {
        // search through the global object for a name that resolves to this object
        for (var name in this.global) {
            if (this.global[name] === this) {
                return this._setName(name);
            }
        }
    };

    /**
     * internal helper function - called in getName()
     * set internal varible
     * @private
     * @param {string} sName  name of the player object
     * @returns {string}
     */
    this._setName = function (sName) {
        this.name = sName;
        return this.name;
    };

    this._rotateCLass = function (sClass, iMax) {
        for (var i = iMax; i > -1; i--) {
            var sCurrentClass = sClass + '-' + i;
            var sNextClass = (i === (iMax) ? '' : sClass + '-' + (i + 1));
            var aObj = document.getElementsByClassName(sCurrentClass);
            for (var j = 0; j < aObj.length; j++) {
                aObj[j].className = aObj[j].className.replace(sCurrentClass, sNextClass);
            }

        }
    };

    /**
     * highlight the last event with maximum color; 
     * @param {type} sEvent
     * @returns {undefined}
     */
    this._markEvent = function (sEvent) {
        this._rotateCLass('mark', 10);
        oSpan = document.getElementById('span-' + sEvent);
        oSpan.className = 'event mark-0';
    };

    // ----------------------------------------------------------------------
    // setup functions
    // ----------------------------------------------------------------------
    /**
     * set div where to show the logs
     * @param {object} oMediaObj  audio or video object
     * @return {boolean}
     */
    this.attach = function (oMediaObj) {
        if (!oMediaObj || !oMediaObj.tagName || (!oMediaObj.tagName === 'AUDIO' && !oMediaObj.tagName === 'VIDEO')) {
            console.log('ERROR in attach: wrong media object tag: ' + oMediaObj.tagName);
            console.log(oMediaObj);
            return false;
        }
        this._aMedia.push(oMediaObj);
        this.log('info', 'debugger', oMediaObj.tagName + ' object was added as media' + (this._aMedia.length -1) );
        this._aMediaLastvar.push({
            networkState: 0,
            readyState: 0
        });
        this._attachEachEvent(this._aMedia.length - 1);
    };

    /**
     * set div where to show the logs
     * @param {object} oDiv  div for output of events
     * @return {boolean}
     */
    this.setOutputEvents = function (oDiv) {
        if (!oDiv || !oDiv.tagName || !oDiv.tagName === 'DIV') {
            console.log('ERROR in setOutputEvents: no div tag');
            console.log(oDiv);
            return false;
        }
        this._oDivEvents = oDiv;
        this._addSpansForEachEvent();

        // TODO: draw all known event names
        return true;
    };
    /**
     * set div where to show the logs
     * @param {object} oDiv  div for output of logs
     * @return {boolean}
     */
    this.setOutputLogs = function (oDiv) {
        if (!oDiv || !oDiv.tagName || !oDiv.tagName === 'DIV') {
            console.log('ERROR in setOutputLogs: no div tag');
            console.log(oDiv);
            return false;
        }
        this._oDivLog = oDiv;
        this.showlog();
        return true;
    };

    this.fireListener = function (evt, iMediaId) {
        this._markEvent(evt.type);
        this.log('event ' + evt.type, 'media' + iMediaId, 'event ' + evt.type);
        
        // check states
        var iLastReadyState=this._aMediaLastvar[iMediaId]['readyState'];
        var iReadyState=this._aMedia[iMediaId]['readyState'];
        var iLastNetworkState=this._aMediaLastvar[iMediaId]['networkState'];
        var iNetworkState=this._aMedia[iMediaId]['networkState'];
        if (iLastReadyState !== iReadyState){
            this.log('state readyState', 'media' + iMediaId, 'readyState switched from '+iLastReadyState + ' to '+this._aConst.properties.readyState.values[iReadyState]);
            /*
            if(iReadyState===4){
                this.log('state readyState', 'media' + iMediaId, 'Browser is ready to play');
            }
            // log('Browser can start to play (enough data)', 'readytoplay');
            */
            this._aMediaLastvar[iMediaId]['readyState']=iReadyState;
             
         }
        if (iLastNetworkState !== iNetworkState){
            this.log('state networkState', 'media' + iMediaId, 'networkState switched from '+iLastNetworkState + ' to '+this._aConst.properties.networkState.values[iNetworkState]);
            /*
            if(iReadyState===4){
                this.log('state readyState', 'media' + iMediaId, 'Browser is ready to play');
            }
            // log('Browser can start to play (enough data)', 'readytoplay');
            */
            this._aMediaLastvar[iMediaId]['networkState']=iNetworkState;
             
         }
         /*
         if (this._aMediaLastvar[iMediaId]['readyState'] !== oAudio.readyState){
         log('readyState switched from '+readyState + ' to '+aReadyState[oAudio.readyState], 'networkstate');
         log('Browser can start to play (enough data)', 'readytoplay');
         readyState=oAudio.readyState;
         }
         if(oAudio.networkState!==netWorkState){
         log('networkState switched from '+netWorkState + ' to '+aNetworkState[oAudio.networkState], 'networkstate');
         netWorkState=oAudio.networkState;
         }
         */

    };

    // ----------------------------------------------------------------------
    // log functions
    // ----------------------------------------------------------------------

    /**
     * add a log message
     * @param {string} sType     loginfo type; one of info|warning|error
     * @param {string} sSource   source of the log entry; debugger or media id
     * @param {string} sMessage  message to log
     * @returns {String|Boolean}
     */
    this.log = function (sType, sSource, sMessage) {
        var detatime = this._microtime(true) - this.starttime;
        this._aLogs.push({
            time: (Math.round(detatime * 1000) / 1000),
            type: sType,
            source: sSource,
            message: sMessage
        });
        return this.showlog();
    };

    /**
     * display log content
     */
    this.showlog = function () {
        if (!this._oDivLog) {
            return false;
        }
        var sLogs = '';
        for (var i = (this._aLogs.length - 1); i >= 0; i--) {
            sLogs += '<div class="' + this._aLogs[i]['type'] + '">'
                    + '<span class="time">' + this._aLogs[i]['time'] + '</span>'
                    + '<span class="source">' + this._aLogs[i]['source'] + '</span> '
                    + '<span class="message">' + this._aLogs[i]['message'] + '</span>'
                    + '</div>'
                    ;
        }
        return this._oDivLog.innerHTML = sLogs;
    };

    this.init = function () {
        this._getName();
        console.log(this.name);
        this._aLogs = [];
        this.starttime = this._microtime(true);
        this.log('info', 'debugger', 'START');
        this.log('info', 'debugger', 'UA: ' + navigator.userAgent);
        return true;
    };

    // ----------------------------------------------------------------------
    // INIT
    // ----------------------------------------------------------------------

    // 
    // this.init();

};
mdbg.prototype.global = this; // required for getName()


// --------------------------------------------------------------------------------
