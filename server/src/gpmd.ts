import {connectWebSocket }from 'https://deno.land/std/ws/mod.ts';

for await (const msg of await connectWebSocket('ws://localhost:5672')) {
    if(typeof msg === 'string') console.log(msg);
}
