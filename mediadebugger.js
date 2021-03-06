/** 
 * media debugger
 * 
 * @author    Axel Hahn
 * @version   0.04
 *
 * Project: https://github.com/axelhahn/mediadebugger
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
    this._oDivProperties = false;  // output div for properties
    this._oDivLog = false;     // output div for logs

    this._aLogs = false;       // array with log entries

    this._aMedia = [];         // array with attached media
    this._aMediaLastvar = [];  // array with attached media
    this.starttime = false;    // timestamp of start
    this.name = false;         // name of the current instance

    // https://www.w3schools.com/TAGS/ref_av_dom.asp
    this._aConst = {
        'properties': {
            'audioTracks': {}, // for video only
            'autoplay': {},
            'buffered': {'readonly': true},
            'controller': {},
            'controls': {},
            'crossOrigin': {},
            'currentSrc': {},
            'currentTime': {},
            'defaultMuted': {},
            'defaultPlaybackRate': {},
            'duration': {},
            'ended': {},
            'error': {},
            'loop': {},
            'mediaGroup': {},
            'muted': {},

            'networkState': {
                'values': [
                    '0 = NETWORK_EMPTY - audio/video has not yet been initialized',
                    '1 = NETWORK_IDLE - audio/video is active and has selected a resource, but is not using the network',
                    '2 = NETWORK_LOADING - browser is downloading data',
                    '3 = NETWORK_NO_SOURCE - no audio/video source found'
                ]
            },
            'paused': {},
            'playbackRate': {},
            'played': {},
            'preload': {},
            
            'readyState': {
                'values': [
                    '0 = HAVE_NOTHING - no information whether or not the audio/video is ready',
                    '1 = HAVE_METADATA - metadata for the audio/video is ready',
                    '2 = HAVE_CURRENT_DATA - data for the current playback position is available, but not enough data to play next frame/millisecond',
                    '3 = HAVE_FUTURE_DATA - data for the current and at least the next frame is available',
                    '4 = HAVE_ENOUGH_DATA - enough data available to start playing'
                ]
            },
            'seekable': {},
            'src': {},
            'startDate': {},
            'textTracks': {},
            'videoTracks': {},
            'volume': {}
            
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

    /**
     * get id in dom for a property 
     * @private
     * @param {integer} iMediaId     id of attached media (0..N)
     * @param {string} propertyname  name of the media property
     * @returns {String}
     */
    this._getId4Property = function (iMediaId, propertyname) {
        return 'span-' + iMediaId+'-'+propertyname;
    };


    /**
     * helper function: create span tags for each media event
     * @private
     * @returns {Boolean}
     */
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
    /**
     * helper function: create span tags for each media property
     * @private
     * @param {integer} iMediaId     id of attached media (0..N)
     * @returns {Boolean}
     */
    this._addSpansForEachProperty = function (iMediaId) {
        if (!this._oDivProperties) {
            return false;
        }
        var sHtml = '',
                propertyname=false
                ;
        sHtml = '<h4>media'+iMediaId+'</h4>';
        for (propertyname in this._aConst.properties) {
            sHtml += '<span id="' + this._getId4Property(iMediaId, propertyname) + '" class="event">' + propertyname + '</span> ';
        }
        sHtml += '<div style="clear: both;"></div>';
        this._oDivProperties.innerHTML = sHtml;

    };
    /**
     * helper function: get properties of media object and update property spans
     * @private
     * @param {integer} iMediaId     id of attached media (0..N)
     * @returns {Boolean}
     */
    this._updateMediaProperties = function (iMediaId) {
        if (!this._oDivProperties) {
            return false;
        }
        var regexFloat=/^[0-9]*\.[0-9]*$/,
                oSpan=false,
                currentValue=false,
                typeclass=false
                ;
        for (var propertyname in this._aConst.properties) {
            oSpan=document.getElementById(this._getId4Property(iMediaId, propertyname));
            currentValue=eval("this._aMedia[iMediaId]." + propertyname);
            Value2Show=currentValue;
            typeclass='';
            if(Value2Show === null){
                typeclass='null';
                Value2Show='';
            } else {
                if(typeof Value2Show === 'undefined'){
                    typeclass='undefined';
                    Value2Show='-';
                }
                if(typeof Value2Show === 'object'){
                    typeclass='object';
                    Value2Show=JSON.stringify(Value2Show);
                }
                if(Value2Show % 1 === 0){
                    typeclass='integer';
                }
                if(Value2Show===true | Value2Show===false){
                    typeclass='boolean';
                }
                if(!typeclass){
                    typeclass='string';
                    if (regexFloat.test(Value2Show) ){
                        typeclass='float';
                    }
                }
            }
            Value2Show = propertyname +' = <span class="type-'+typeclass+'">' + Value2Show + '</span> ('+typeclass+')';
            if (oSpan.innerHTML !== Value2Show){
                oSpan.innerHTML=Value2Show;
                oSpan.className='event mark-0';
            }
        }

    };

    /**
     * helper function: attach all events to media object in dom to fetch all updates
     * @private
     * @param {integer} iMediaId     id of attached media (0..N)
     * @returns {Boolean}
     */
    this._attachEachEvent = function (iMediaId) {
        if (!this._aMedia.length || iMediaId > this._aMedia.length) {
            console.log('ERROR in _attachEachEvent: media id ' + iMediaId + ' is wrong: no media or id larger than count.');
            return false;
        }
        var i=false,
            eventname=false
        ;
        var selfobject = this;
        for (i = 0; i < this._aConst.eventnames.length; i++) {
            eventname = this._aConst.eventnames[i];

            this._aMedia[iMediaId].addEventListener(eventname, function (event) {
                selfobject.fireListener(event, iMediaId);
            });
        }
        this.log('info', 'debugger', 'events were added to media'+iMediaId);
    };

    /**
     * helper function: get microtime (= in milliseconds) since init
     * @param {type} get_as_float
     * @returns {Number|String}
     */
    this._microtime = function (get_as_float) {
        var now = new Date().getTime() / 1000;
        var s = parseInt(now);
        return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
    };

    /**
     * helper function - called in init()
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

    /**
     * helper function: rotate css clases named "mark"+number
     * @private
     * @param {string}  sClass  name of css class
     * @param {integer} iMax    max number
     * @returns {undefined}
     */
    this._rotateCLass = function (sClass, iMax) {
        var i=false, 
            j=false,
            aObj=false,
            sCurrentClass=false,
            sNextClass=false
            ;
        for (i = iMax; i > -1; i--) {
            sCurrentClass = sClass + '-' + i;
            sNextClass = (i === (iMax) ? '' : sClass + '-' + (i + 1));
            aObj = document.getElementsByClassName(sCurrentClass);
            for (j = 0; j < aObj.length; j++) {
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
        //this._rotateCLass('mark', 10);
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
        this._addSpansForEachProperty(this._aMedia.length - 1);
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
     * @param {object} oDiv  div for output of events
     * @return {boolean}
     */
    this.setOutputProperties = function (oDiv) {
        if (!oDiv || !oDiv.tagName || !oDiv.tagName === 'DIV') {
            console.log('ERROR in setOutputProperties: no div tag');
            console.log(oDiv);
            return false;
        }
        this._oDivProperties = oDiv;

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

    /**
     * callback function for added event listeners
     * it gets the last vent log and 
     * - adds log entry
     * - updates events
     * - updates properties
     * 
     * @param {type} evt
     * @param {type} iMediaId
     * @returns {undefined}
     */
    this.fireListener = function (evt, iMediaId) {
                
        this._rotateCLass('mark', 10);
        this._rotateCLass('mark', 10);
        
        this._markEvent(evt.type);
        this._updateMediaProperties(iMediaId);
        
        this.log('event ' + evt.type, 'media' + iMediaId, 'event ' + evt.type);
        
        // check states
        var iLastReadyState=this._aMediaLastvar[iMediaId]['readyState'];
        var iReadyState=this._aMedia[iMediaId]['readyState'];
        var iLastNetworkState=this._aMediaLastvar[iMediaId]['networkState'];
        var iNetworkState=this._aMedia[iMediaId]['networkState'];
        if (iLastReadyState !== iReadyState){
            this.log('state readyState', 'media' + iMediaId, 'readyState switched from '+iLastReadyState + ' to '+this._aConst.properties.readyState.values[iReadyState]);
            this._aMediaLastvar[iMediaId]['readyState']=iReadyState;
             
         }
        if (iLastNetworkState !== iNetworkState){
            this.log('state networkState', 'media' + iMediaId, 'networkState switched from '+iLastNetworkState + ' to '+this._aConst.properties.networkState.values[iNetworkState]);
            this._aMediaLastvar[iMediaId]['networkState']=iNetworkState;
             
         }
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
    this.showlog = function (iCount) {
        if (!this._oDivLog) {
            return false;
        }
        if(!iCount){
            iCount=50;
        }
        var sLogs = '';
        for (var i = (this._aLogs.length - 1); i >= Math.max(0, (this._aLogs.length - iCount)); i--) {
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
