// --------------------------------------------------------------------------------------------------------- //
// LCCS ALT4 Project
// Main program file
// Description: Temperature sensor with extra features such as temperature alerts, receivers etc.
// Language: TypeScript
// --------------------------------------------------------------------------------------------------------- //

// --------------------------------------------------------------------------------------------------------- //
// This project uses TypeScript, a subset of the JavaScript language that supports type checking, 
// to help prevent mismatched types, e.g. passing a string instead of a number. 

// You will notice this when looking at functions or variables, where the type is defined afterwards, 
// e.g. `mode: 0 | 1 = 0;` essentially states that `mode` must be `0` or `1`, and is assigned `0` by default.
// --------------------------------------------------------------------------------------------------------- //

// --------------------------------------------------------------------------------------------------------- //
// This project requires at minimum a Micro:bit of version 2 or higher.
// Currently, as of 24/09/25, version 2 is the highest version available.
// --------------------------------------------------------------------------------------------------------- //

// --------------------------------------------------------------------------------------------------------- //

// Setup radio communication
radio.setGroup(25);

// Initalise data logging
datalogger.setColumns(
    [
        // Temperature
        "Temperature (°C) - Input", 
        "Temperature (°C) - Received",

        // upperLimit
        "Upper Limit - Input",
        "Upper Limit - Received",

        // lowerLimit
        "Lower Limit - Input",
        "Lower Limit - Received",

        // Avg. Temp
        "Avg. Temperature (°C) - Input",
        "Avg. Temperature (°C) - Received",

        // Errors
        "isError", 
        "Error"
    ]
);

// --------------------------------------------------------------------------------------------------------- //
// Handle the mode selection
// --------------------------------------------------------------------------------------------------------- //

//  Probably should've used strings for this, but too late now.
/**
 * *The mode the Micro:bit is in.*
 * 
 * ``0``: Send
 * 
 * ``1``: Receive
 * 
 * *Defaults to* ``0``
 */

let mode: 0 | 1 = 0;
let modeSelection: boolean = true;

// Since there is no flash memory support on the Micro:bit, this will be prompted at every start. 
// Unfortunately, this is unfixable.
/**
 * Function that prompts the user to select the desired mode.
 */
function modeSelect() {
    modeSelection = true;
    control.inBackground(function () {
        basic.showString("A=Send B=Recv");
        basic.clearScreen();
    });
}

// Handle Button A press for Mode 0
input.onButtonPressed(Button.A, function() {
    if (modeSelection === true) {
        basic.clearScreen();
        modeSelection = false;
        mode = 0;
        // basic.showString("SENDER");
        basic.clearScreen();
    }
});

// Handle Button B press for Mode 1
input.onButtonPressed(Button.B, function() {
    if (modeSelection === true) {
        basic.clearScreen();
        modeSelection = false;
        mode = 1;
        // basic.showString("RECEIVER");
        basic.clearScreen();
    }
});

// Prompt user for their desired mode.
modeSelect();
basic.clearScreen();

// --------------------------------------------------------------------------------------------------------- //
// Define variables, types etc.
// --------------------------------------------------------------------------------------------------------- //

/** The upper bound of the temperature before a warning appears to the user. */
let upperLimit: number | null = 25;
/** The lower bound of the temperature before a warning appears to the user. */
let lowerLimit: number | null = 18;

/** The temperature if received over radio from the sender Micro:bit. */
let receivedTemperature: number | null = 0;
/** Same as ``upperLimit``, but if received over radio. */
let receivedUpperLimit: number | null = 0;
/** Same as ``lowerLimit``, but if received over radio. */
let receivedLowerLimit: number | null = 0;
/** The average temperature of the receiver and sender Micro:bits. Only defined in Mode 1. */
let receivedAvgTemp: number | null;

/**
 * Object to easily handle error messages by scope and code
 */
const errors = {
    // Generic
    generic: {
        0: "Unknown error occurred - please reset this Micro:bit",
        1: "Unknown error occurred - error is recoverable, continuing execution" // This ideally should not be shown to the user, only logged, or if neccessary shown in a more user-friendly way.
    },
    // Modes
    mode: {
        0: "Value was received but mode was incorrect to perform operation (Mode 0)",
        1: "Invalid values were received (Mode 1)",
        2: "Data has not been received - please wait"
    },
    func: {
        0: "Invalid values were received"
    }
};

type ErrorMessage =
    | (typeof errors)["mode"][keyof typeof errors["mode"]]
    | (typeof errors)["generic"][keyof typeof errors["generic"]]
    | (typeof errors)["func"][keyof typeof errors["func"]];

/**
 *  Function to beep the Micro:bit.
 * 
 *  All beeps should be the same, so this is here to stop custom beeps which would be confusing
 */
function beep() {
    music.playTone(200, music.beat(BeatFraction.Whole));
}

type TemperatureWarningResult = {
    message: string | null;
    error: ErrorMessage | null;
}

/**
 *  Function to warn users of extreme temperatures.
 * 
 *  **Temperature checking logic is not handled in this function.**
 * 
 *  @param type The type of warning.
 */
function temperatureWarning(type: "lowerLimit" | "upperLimit"): TemperatureWarningResult {
    if (type !== "lowerLimit" && type !== "upperLimit") {
        datalogger.logData([
            datalogger.createCV("isError", true),
            datalogger.createCV("Error", errors.func[0])
        ]);
        return { message: null, error: errors.func[0] };
    }
    basic.clearScreen();
    if (type === "lowerLimit") {
        basic.showLeds(`
        . . # . .
        . # # # .
        # # # # #
        . . # . .
        . . # . .
        `)
    } else if (type === "upperLimit") {
        basic.showLeds(`
        . . # . .
        . . # . .
        # # # # #
        . # # # .
        . . # . .
        `)
    }
    // String ended up being too long to work properly - blocked everything (incl. beeping) until it scrolled as well
    // basic.showString(`TEMP ${type === "lowerLimit" ? "LOW" : "HIGH"}`);

    // Play note once, wait one second, repeat 4 times
    // Bit of a hacky solution, but it should work
    beep();
    for (let i = 0; i < 4; i++) {
        beep();
    }
    return { message: "Warned user of temperature", error: null };
}

/**
 *  Function to send values through radio. Will be picked up by any receiving Micro:bit(s)
 */
function sendRadioValues() {
    radio.sendValue("temperature", input.temperature());
    radio.sendValue("upperLimit", upperLimit);
    radio.sendValue("lowerLimit", lowerLimit);
}

// --------------------------------------------------------------------------------------------------------- //
// Receiver Mode (Mode 1)
// --------------------------------------------------------------------------------------------------------- //

// When a radio value is received
radio.onReceivedValue(function on_received_value(name: string, value: number) {
    const allowedNames: Array<string> = ["temperature", "upperLimit", "lowerLimit"];
    // If mode is 0 (i.e. send mode), silently fail and log the event.
    if (mode == 0) {
        datalogger.logData([
            datalogger.createCV("isError", true),
            datalogger.createCV("Error", errors.mode[0])
        ]);
        return;
    }
    
    // If the mode is correct but the values are wrong, e.g. empty, then return an error to the user.
    if (allowedNames.indexOf(name) === -1 && (value == 0 || value == null || value == null)) {
        // Log the error
        datalogger.logData([
            datalogger.createCV("isError", true),
            datalogger.createCV("Error", errors.mode[1])
        ]);
        // Show an error to the user
        basic.showLeds(`
            . # # # .
            . . . . #
            . . # # .
            . . . . .
            . . # . .
        `, 3000)
        return
    }

    // Define values as they are received.
    switch(name) {
        case "temperature":
            receivedTemperature = value;
            break;
        case "upperLimit":
            receivedUpperLimit = value;
            break;
        case "lowerLimit":
            receivedLowerLimit = value;
            break;
        default:
            break;
    }

    // If all values aren't defined, then show an error and don't continue.
    if (receivedTemperature === null || receivedUpperLimit === null || receivedLowerLimit === null) {
        // Show the error to the user
        basic.showString(errors.mode[2]);
        // Log the error
        datalogger.logData([
            datalogger.createCV("isError", true),
            datalogger.createCV("Error", errors.mode[2])
        ]);
    }

    // Assuming all values are present and correct, the code continues.

    // Show a warning depending on temperature
    // High temperature
    if (input.temperature() > receivedUpperLimit) {
        temperatureWarning("upperLimit");
    }

    // Low temperature
    if (input.temperature() < receivedLowerLimit) {
        temperatureWarning("lowerLimit");
    }

    // Calculate average temperature
    let avgTemp = (input.temperature() + receivedTemperature) / 2;
    receivedAvgTemp = avgTemp;

    // Show and log data
    basic.showString(receivedAvgTemp.toString() || avgTemp.toString());
    datalogger.logData([
        datalogger.createCV("Temperature (°C) - Received", receivedTemperature),
        datalogger.createCV("Avg. Temperature (°C) - Received", avgTemp),
        datalogger.createCV("Upper Limit - Received", receivedUpperLimit),
        datalogger.createCV("Lower Limit - Received", receivedLowerLimit),
    ]);
});

// --------------------------------------------------------------------------------------------------------- //
// Sender Mode (Mode 0)
// --------------------------------------------------------------------------------------------------------- //

basic.forever(function on_forever() {
    if (modeSelection === true) {
        return;
    }
    if (mode === 0) {
        // Encapsulated into a function so that it doesn't wait on the 5000ms delay
        const mainLoop = () => {
            basic.clearScreen();
            basic.showString(input.temperature().toString());
            // Show a warning depending on temperature
            // High temperature
            if (input.temperature() > upperLimit) {
                temperatureWarning("upperLimit");
            }

            // Low temperature
            if (input.temperature() < lowerLimit) {
                temperatureWarning("lowerLimit");
            }
        }
        mainLoop();
        basic.pause(2500);
        // sendRadioValues();
    } else if (mode === 1) {
        basic.showString(receivedAvgTemp.toString() || "?");
        return;
    }
})

// --------------------------------------------------------------------------------------------------------- //
// Hydration reminder code
//
// IMPORTANT: This may get interrupted, due to how the Micro:bit runtime schedules tasks. 
// This function cannot be prioritised, so other functions or events like onRadioReceived may interrupt and cut it off early. 
// As far as I'm aware, there is no workaround to this, as it is inherently a Micro:bit limitation.
// This is an unsolvable bug, without extensive modification of the underlying operating system's core scheduler, which is unfeasible.
// --------------------------------------------------------------------------------------------------------- //

control.inBackground(function () {
    while (true) {
        basic.pause(3600000); // 3600000ms = 1 hour

        // Skip the reminder if in mode selection
        if (modeSelection) {

        } else {
            // Reset hydration reminder
            for (let i = 0; i < 3; i++) {
                basic.clearScreen();
                beep();
                basic.showLeds(`
                    . . # . .
                    . # . # .
                    # . . . #
                    # . . . #
                    . # # # .
                `);
                basic.pause(5000); // 5 seconds between beeps
            }

            // Log current values too
            if (mode === 0) {
                datalogger.logData([
                    datalogger.createCV("Temperature (°C) - Input", input.temperature()),
                    datalogger.createCV("Upper Limit - Input", upperLimit),
                    datalogger.createCV("Lower Limit - Input", lowerLimit),
                ]);
            } else if (mode === 1) {
                datalogger.logData([
                    datalogger.createCV("Temperature (°C) - Received", receivedTemperature),
                    datalogger.createCV("Avg. Temperature (°C) - Received", receivedAvgTemp),
                    datalogger.createCV("Upper Limit - Received", receivedUpperLimit),
                    datalogger.createCV("Lower Limit - Received", receivedLowerLimit),
                ]);
            }
        }
    }
});