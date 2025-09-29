# Mode 0 = send
# Mode 1 = receive

def on_button_pressed_a():
    basic.show_number(input.temperature())
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    basic.show_number(avg_temp)
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_received_value(name, value):
    global avg_temp
    allowedNames = ["temperature", "upperLimit", "lowerLimit"]
    if mode == 1:
        basic.show_string("Invalid values received!")
        return
    if allowedNames[name] and (value == 0 or value == None or value == None):
        return
    avg_temp += input.temperature() + value / 2
radio.on_received_value(on_received_value)

avg_temp = 0
mode = 0
mode = 0
avg_temp = 0
radio.set_group(21)
radio.send_number(input.temperature())

def on_forever():
    if input.temperature() > 30:
        basic.show_string("!!!")
        music.play(music.tone_playable(294, music.beat(BeatFraction.WHOLE)),
            music.PlaybackMode.UNTIL_DONE)
        pins.digital_write_pin(DigitalPin.P1, 1)
    elif input.temperature() < 3:
        basic.show_string("!!!")
        music.play(music.tone_playable(294, music.beat(BeatFraction.WHOLE)),
            music.PlaybackMode.UNTIL_DONE)
        pins.digital_write_pin(DigitalPin.P1, 1)
    else:
        pins.digital_write_pin(DigitalPin.P1, 0)
basic.forever(on_forever)

def on_every_interval():
    for index in range(3):
        music._play_default_background(music.built_in_playable_melody(Melodies.BA_DING),
            music.PlaybackMode.IN_BACKGROUND)
        basic.show_string("DrinkWater")
loops.every_interval(3600000, on_every_interval)
