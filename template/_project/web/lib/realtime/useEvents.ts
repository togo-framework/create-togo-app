"use client";

import { useEffect, useRef } from "react";

// useEvents subscribes to the backend SSE stream (/events) and invokes the
// handler whenever an event with the given name is broadcast (e.g. "post.created").
// Pass "*" to receive every event. Event-driven UIs: refetch, toast, live-update.
//
//   useEvents("post.created", (data) => mutate("/posts"));
export function useEvents(event: string, onEvent: (data: unknown) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const es = new EventSource("/events");
    const listener = (e: MessageEvent) => {
      let data: unknown = e.data;
      try {
        data = JSON.parse(e.data);
      } catch {
        /* keep raw */
      }
      handler.current(data);
    };
    if (event === "*") {
      es.onmessage = listener;
    } else {
      es.addEventListener(event, listener as EventListener);
    }
    return () => es.close();
  }, [event]);
}
