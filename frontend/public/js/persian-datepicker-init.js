// Persian Datepicker Initialization
(function() {
    // console.log("Persian Datepicker init script loaded");

    // Initialize Jalali Datepicker
    function initJalaliDatepicker() {
        if (typeof jalaliDatepicker !== 'undefined') {
            jalaliDatepicker.startWatch({
                showTodayBtn: true,
                showEmptyBtn: true,
                time: true,
                topSpace: 10,
                bottomSpace: 30,
                dayRendering: function(opt, input) {
                    return {
                        isHollyDay: opt.day === 1
                    };
                }
            });
            // console.log("Jalali Datepicker initialized");
        } else {
            console.warn("jalaliDatepicker not available");
        }
    }

    // Initialize MDS Persian DateTime Picker
    function initMdsDateTimePicker() {
        // Check multiple possible namespaces
        const mds = window.mds || window.Mds || window.mdsPersianDateTimePicker;
        
        if (!mds || !mds.MdsPersianDateTimePicker) {
            console.warn("MDS Persian DateTime Picker not available yet, retrying...");
            return false;
        }

        // console.log("MDS object found, initializing pickers...");

        try {
            // Range picker
            const rangePicker = document.getElementById("range-picker");
            if (rangePicker) {
                new mds.MdsPersianDateTimePicker(rangePicker, {
                    targetTextSelector: '[data-name="range-picker"]',
                    rangeSelector: true,
                    placement: "bottom"
                });
            }

            // String date picker
            const stringDate = document.getElementById("string-date");
            if (stringDate) {
                new mds.MdsPersianDateTimePicker(stringDate, {
                    targetTextSelector: '[data-name="string-date"]',
                    textFormat: "dd MMMM yyyy",
                    placement: "bottom"
                });
            }

            // Format date picker
            const formatDate = document.getElementById("format-date");
            if (formatDate) {
                new mds.MdsPersianDateTimePicker(formatDate, {
                    targetTextSelector: '[data-name="format-date"]',
                    textFormat: "yyyy-MM-dd",
                    placement: "bottom"
                });
            }

            // Week name picker
            const weekName = document.getElementById("week-name");
            if (weekName) {
                new mds.MdsPersianDateTimePicker(weekName, {
                    targetTextSelector: '[data-name="week-name"]',
                    textFormat: "dddd dd MMMM yyyy",
                    placement: "bottom"
                });
            }

            // Custom format picker with time
            const customFormat = document.getElementById("custom-format");
            if (customFormat) {
                new mds.MdsPersianDateTimePicker(customFormat, {
                    targetTextSelector: '[data-name="custom-format"]',
                    enableTimePicker: true,
                    textFormat: "dddd dd MMMM ساعت HH:mm:ss tt",
                    placement: "bottom"
                });
            }

            // console.log("All MDS Persian DateTime Pickers initialized successfully");
            return true;

        } catch (error) {
            console.error("Error initializing MDS Persian Date Picker:", error);
            return false;
        }
    }

    // Initialize jalaliDatepicker immediately
    setTimeout(initJalaliDatepicker, 100);

    // Wait for MDS to be available
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max (50 * 100ms)
    
    function waitForMds() {
        if (initMdsDateTimePicker()) {
            return; // Success
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
            setTimeout(waitForMds, 100);
        } else {
            console.error("MDS Persian DateTime Picker failed to load after maximum retries");
        }
    }

    // Start checking for MDS
    waitForMds();

    // Also listen for DOM content loaded as a fallback
    document.addEventListener('DOMContentLoaded', function() {
        initJalaliDatepicker();
        initMdsDateTimePicker();
    });

})();