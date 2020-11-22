local JSON = require('dkjson')

local PlayingState = {
    [1] = 'started',
    [2] = 'playing',
    [3] = 'paused',
    [4] = 'stopping',
    [5] = 'stopped'
}

local socket = -1

local state = {
    speed = 1,
    position = 0,
    duration = 0,
    state = 'stopped'
}
local last_play_state = 5
local last_time = 0
local had_input = false

function logDebug(data)
    vlc.msg.dbg(data)
end

function send_to_socket( type, data )
    if socket > 0 then
        local res = vlc.net.send(socket, JSON.encode({
            type = type,
            data = data,
        }))
        if res == -1 then
            socket = -1
        end
    end
end

function connect_socket()
    socket = vlc.net.connect_tcp('localhost', 235)
end

function disconnect_socket()
    if socket > 0 then
        vlc.net.close(socket)
        socket = -1
    end
end

function make_current_state()
    if last_play_state ~= 2 then
        return {
            state = state.state
        }
    end
    local item = vlc.input.item()
    if item == nil then
        return nil
    end

    local meta = item:metas()
    logDebug(JSON.encode(meta))

    return {
        title = meta.title,
        artist = meta.artist,
        file = meta.filename,
        position = state.position,
        duration = state.duration,
        rate = state.speed,
        state = state.state,
        artwork_url = meta.artwork_url,
    }
end

function get_duration( item )
    local duration = nil
    local i = 0
    repeat
        if item:duration() then
            duration = item:duration()
        else
            vlc.misc.mwait(vlc.misc.mdate() + 100000)
        end
        i = i + 1
    until duration or i > 10
    return duration or 0
end

-- "time" only changes in some ticks (higher delay)
function has_time_changed( old_time, new_time, speed )
    local time_diff = math.abs( new_time - old_time )

    if speed < 1 then
        speed = speed * speed + 2 * speed
    end

    return time_diff > 600000 * speed
end

function process_changes(diff)
    local any_change = false

    local input = vlc.object.input()

    local play_state = input and vlc.var.get(input, 'state') or 5
    if play_state ~= last_play_state then
        last_play_state = play_state
        state.state = PlayingState[play_state]
        any_change = true
    end

    -- return if not playing or input is nil
    if not input or play_state ~= 2 then return any_change end

    local item = vlc.input.item()

    if not item then
        if had_input then
            had_input = false
            logDebug('input')
            any_change = true
        end
        return any_change -- return early
    end

    local speed = vlc.var.get(input, "rate")
    if state.speed ~= speed then
        state.speed = speed
        logDebug('speed')
        any_change = true
    end
    local time = vlc.var.get(input, 'time')
    -- "round" to avoid diffs
    local duration = math.floor(math.max(get_duration(item), 0) * 10) / 10
    local position = time / 1000000

    if duration ~= state.duration then
        logDebug(string.format( "duration; diff: %.3f", duration - state.duration ))
        state.duration = duration
        any_change = true
    elseif has_time_changed(last_time, time, speed) then
        logDebug(string.format( "time; old: %.1f new: %.1f t_diff: %.1f diff: %.1f", last_time, time, time - last_time, diff ))
        any_change = true
    end

    last_time = time
    state.position = position

    return any_change
end

function run_loop()
    connect_socket()

    local last_tick = vlc.misc.mdate()
    local ping_tick = 0
    while true do
        if socket < 0 or vlc.volume.get() == -256 then
            break
        end
        ping_tick = ping_tick + 1

        if process_changes(vlc.misc.mdate() - last_tick) then
            logDebug('send');
            send_to_socket('state', make_current_state())
            ping_tick = 0
        end

        last_tick = vlc.misc.mdate()

        if ping_tick > 2400 then
            logDebug('ping')
            --send something every 60s to make sure the connection is alive
            send_to_socket('ping', {})
            ping_tick = 0
        end

        vlc.misc.mwait(vlc.misc.mdate() + 25000)
    end
    disconnect_socket()
end

while vlc.volume.get() ~= -256 do
    run_loop()

    if vlc.volume.get() ~= -256 then
        logDebug('waiting')
        vlc.misc.mwait(vlc.misc.mdate() + 60 * 1000 * 1000)
    end
end
