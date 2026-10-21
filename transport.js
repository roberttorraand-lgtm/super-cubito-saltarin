// Consume exactly one simulation step, dropping accumulated network delay rather
// than playing half a second of obsolete movement after a connection hiccup.
export function takeInput(queue,jumpHeld=false,interactHeld=false){
  if(queue.length>4){
    const discarded=queue.splice(0,queue.length-4);
    // Preserve a short jump press that arrived in the same burst as its release.
    if(!jumpHeld&&discarded.some(frame=>frame.jump))queue[0]={...queue[0],jump:true};
    if(!interactHeld&&discarded.some(frame=>frame.interact))queue[0]={...queue[0],interact:true};
  }
  return queue.shift();
}
export function queueInput(queue,frame,jumpHeld=false,interactHeld=false){
  queue.push(frame);
  if(queue.length>30){
    const discarded=queue.splice(0,queue.length-30);
    if(!jumpHeld&&discarded.some(input=>input.jump))queue[0]={...queue[0],jump:true};
    if(!interactHeld&&discarded.some(input=>input.interact))queue[0]={...queue[0],interact:true};
  }
}
