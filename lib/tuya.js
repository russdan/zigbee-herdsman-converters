'use strict';

const constants = require('./constants');

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

function getDataValue(dataType, data) {
    switch (dataType) {
    case dataTypes.raw:
        return data;
    case dataTypes.bool:
        return data[0] === 1;
    case dataTypes.value:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    case dataTypes.string:
        // eslint-disable-next-line
        let dataString = '';
        // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
        for (let i = 0; i < data.length; ++i) {
            dataString += String.fromCharCode(data[i]);
        }
        return dataString;
    case dataTypes.enum:
        return data[0];
    case dataTypes.bitmap:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    }
}

function convertDecimalValueTo4ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(8, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2, 2);
    const chunk3 = hexValue.substr(4, 2);
    const chunk4 = hexValue.substr(6);
    return [chunk1, chunk2, chunk3, chunk4].map((hexVal) => parseInt(hexVal, 16));
}

function convertDecimalValueTo2ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}

async function onEventSetTime(type, data, device) {
    if (data.type === 'commandSetTimeRequest' && data.cluster === 'manuSpecificTuya') {
        const utcTime = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000);
        const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
        const endpoint = device.getEndpoint(1);
        const payload = {
            payloadSize: 8,
            payload: [
                ...convertDecimalValueTo4ByteHexArray(utcTime),
                ...convertDecimalValueTo4ByteHexArray(localTime),
            ],
        };
        await endpoint.command('manuSpecificTuya', 'setTime', payload, {});
    }
}

// set UTC and Local Time as total number of seconds from 00: 00: 00 on January 01, 1970
async function onEventSetLocalTime(type, data, device) {
    if (data.type === 'commandSetTimeRequest' && data.cluster === 'manuSpecificTuya') {
        const utcTime = Math.round(((new Date()).getTime()) / 1000);
        const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
        const endpoint = device.getEndpoint(1);
        const payload = {
            payloadSize: 8,
            payload: [
                ...convertDecimalValueTo4ByteHexArray(utcTime),
                ...convertDecimalValueTo4ByteHexArray(localTime),
            ],
        };
        await endpoint.command('manuSpecificTuya', 'setTime', payload, {});
    }
}

function convertStringToHexArray(value) {
    const asciiKeys = [];
    for (let i = 0; i < value.length; i ++) {
        asciiKeys.push(value[i].charCodeAt(0));
    }
    return asciiKeys;
}

const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const thermostatSystemModes2 = {
    0: 'auto',
    1: 'cool',
    2: 'heat',
    3: 'dry',
    4: 'fan',
};

const thermostatSystemModes3 = {
    0: 'auto',
    1: 'heat',
    2: 'off',
};

const dataPoints = {
    // Common data points
    // Below data points are usually shared between devices
    state: 1,
    heatingSetpoint: 2,
    coverPosition: 2,
    dimmerLevel: 3,
    localTemp: 3,
    coverArrived: 3,
    occupancy: 3,
    mode: 4,
    fanMode: 5,
    motorDirection: 5,
    config: 5,
    childLock: 7,
    coverChange: 7,
    runningState: 14,
    valveDetection: 20,
    battery: 21,
    tempCalibration: 44,
    // Data points above 100 are usually custom function data points
    waterLeak: 101,
    minTemp: 102,
    maxTemp: 103,
    windowDetection: 104,
    boostTime: 105,
    forceMode: 106,
    comfortTemp: 107,
    ecoTemp: 108,
    valvePos: 109,
    batteryLow: 110,
    weekFormat: 111,
    scheduleWorkday: 112,
    scheduleHoliday: 113,
    awayTemp: 114,
    autoLock: 116,
    awayDays: 117,
    // Manufacturer specific
    // Earda
    eardaDimmerLevel: 2,
    // Siterwell Thermostat
    siterwellWindowDetection: 18,
    // Moes Thermostat
    moesHold: 2,
    moesScheduleEnable: 3,
    moesHeatingSetpoint: 16,
    moesMaxTempLimit: 18,
    moesMaxTemp: 19,
    moesMinTemp: 20,
    moesLocalTemp: 24,
    moesTempCalibration: 27,
    moesValve: 36,
    moesChildLock: 40,
    moesSensor: 43,
    moesSchedule: 101,
    etopErrorStatus: 13,
    // Neo T&H
    neoUnknown1: 101,
    neoMelody: 102,
    neoDuration: 103,
    neoAlarm: 104,
    neoTemp: 105,
    neoHumidity: 106,
    neoMinTemp: 107,
    neoMaxTemp: 108,
    neoMinHumidity: 109,
    neoMaxHumidity: 110,
    neoUnknown2: 112,
    neoTempAlarm: 113,
    neoHumidityAlarm: 114,
    neoUnknown3: 115,
    neoVolume: 116,
    // Saswell TRV
    saswellWindowDetection: 8,
    saswellFrostDetection: 10,
    saswellTempCalibration: 27,
    saswellChildLock: 40,
    saswellState: 101,
    saswellLocalTemp: 102,
    saswellHeatingSetpoint: 103,
    saswellValvePos: 104,
    saswellBatteryLow: 105,
    saswellAwayMode: 106,
    saswellScheduleMode: 107,
    saswellScheduleEnable: 108,
    saswellScheduleSet: 109,
    saswellSetpointHistoryDay: 110,
    saswellTimeSync: 111,
    saswellSetpointHistoryWeek: 112,
    saswellSetpointHistoryMonth: 113,
    saswellSetpointHistoryYear: 114,
    saswellLocalHistoryDay: 115,
    saswellLocalHistoryWeek: 116,
    saswellLocalHistoryMonth: 117,
    saswellLocalHistoryYear: 118,
    saswellMotorHistoryDay: 119,
    saswellMotorHistoryWeek: 120,
    saswellMotorHistoryMonth: 121,
    saswellMotorHistoryYear: 122,
    saswellScheduleSunday: 123,
    saswellScheduleMonday: 124,
    saswellScheduleTuesday: 125,
    saswellScheduleWednesday: 126,
    saswellScheduleThursday: 127,
    saswellScheduleFriday: 128,
    saswellScheduleSaturday: 129,
    saswellAntiScaling: 130,
    // HY thermostat
    hyHeating: 102,
    hyExternalTemp: 103,
    hyAwayDays: 104,
    hyAwayTemp: 105,
    hyMaxTempProtection: 106,
    hyMinTempProtection: 107,
    hyTempCalibration: 109,
    hyHysteresis: 110,
    hyProtectionHysteresis: 111,
    hyProtectionMaxTemp: 112,
    hyProtectionMinTemp: 113,
    hyMaxTemp: 114,
    hyMinTemp: 115,
    hySensor: 116,
    hyPowerOnBehavior: 117,
    hyWeekFormat: 118,
    hyWorkdaySchedule1: 119,
    hyWorkdaySchedule2: 120,
    hyHolidaySchedule1: 121,
    hyHolidaySchedule2: 122,
    hyState: 125,
    hyHeatingSetpoint: 126,
    hyLocalTemp: 127,
    hyMode: 128,
    hyChildLock: 129,
    hyAlarm: 130,
    // Silvercrest
    silvercrestChangeMode: 2,
    silvercrestSetBrightness: 3,
    silvercrestSetColor: 5,
    silvercrestSetEffect: 6,
};

const thermostatWeekFormat = {
    0: '5+2',
    1: '6+1',
    2: '7',
};

const thermostatForceMode = {
    0: 'normal',
    1: 'open',
    2: 'close',
};

const thermostatPresets = {
    0: 'away',
    1: 'schedule',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const thermostatScheduleMode = {
    1: 'single', // One schedule for all days
    2: 'weekday/weekend', // Weekdays(2-5) and Holidays(6-1)
    3: 'weekday/sat/sun', // Weekdays(2-6), Saturday(7), Sunday(1)
    4: '7day', // 7 day schedule
};

const silvercrestModes = {
    white: 0,
    color: 1,
    effect: 2,
};

const silvercrestEffects = {
    steady: '00',
    snow: '01',
    rainbow: '02',
    snake: '03',
    twinkle: '04',
    firework: '08',
    horizontal_flag: '06',
    waves: '07',
    updown: '08',
    vintage: '09',
    fading: '0a',
    collide: '0b',
    strobe: '0c',
    sparkles: '0d',
    carnaval: '0e',
    glow: '0f',
};

const fanModes = {
    0: 'low',
    1: 'medium',
    2: 'high',
    3: 'auto',
};

async function sendDataPoint(entity, datatype, dp, data) {
    if (sendDataPoint.transId === undefined) {
        sendDataPoint.transId = 0;
    } else {
        sendDataPoint.transId++;
        sendDataPoint.transId %= 256;
    }
    await entity.command(
        'manuSpecificTuya',
        'setData',
        {
            status: 0,
            transid: sendDataPoint.transId,
            dp: dp,
            datatype: datatype,
            length_hi: (data.length >> 8) & 0xFF,
            length_lo: data.length & 0xFF,
            data: data,
        },
        {disableDefaultResponse: true},
    );
}

async function sendDataPointValue(entity, dp, value) {
    await sendDataPoint(
        entity,
        dataTypes.value,
        dp,
        convertDecimalValueTo4ByteHexArray(value));
}

async function sendDataPointBool(entity, dp, value) {
    await sendDataPoint(
        entity,
        dataTypes.bool,
        dp,
        [value ? 1 : 0]);
}

async function sendDataPointEnum(entity, dp, value) {
    await sendDataPoint(
        entity,
        dataTypes.enum,
        dp,
        [value]);
}

async function sendDataPointRaw(entity, dp, value) {
    await sendDataPoint(
        entity,
        dataTypes.raw,
        dp,
        value);
}

async function sendDataPointBitmap(entity, dp, value) {
    await sendDataPoint(
        entity,
        dataTypes.bitmap,
        dp,
        value);
}

module.exports = {
    sendDataPoint,
    sendDataPointValue,
    sendDataPointBool,
    sendDataPointEnum,
    sendDataPointBitmap,
    sendDataPointRaw,
    getDataValue,
    dataTypes,
    dataPoints,
    convertDecimalValueTo4ByteHexArray,
    convertDecimalValueTo2ByteHexArray,
    onEventSetTime,
    onEventSetLocalTime,
    convertStringToHexArray,
    thermostatSystemModes3,
    thermostatSystemModes2,
    thermostatSystemModes,
    thermostatWeekFormat,
    thermostatForceMode,
    thermostatPresets,
    thermostatScheduleMode,
    silvercrestModes,
    silvercrestEffects,
    fanModes,
};