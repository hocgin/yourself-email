import {LangKit} from "@hocgin/hkit";


export const setScrollTop = (el: Document | Element, top: number) => {
  // if (el === document || el === document.body) {
  //   top = Math.min(window.pageYOffset, document.documentElement.scrollHeight, document.body.scrollHeight, top);
  // }

  console.log('top', top);
  // @ts-ignore
  el.scrollTop = top;
};

export function getTargetElement(target, defaultElement = undefined) {
  if (!LangKit.isBrowser()) {
    return undefined;
  }
  if (!target) {
    return defaultElement;
  }
  var targetElement;
  if (LangKit.isFunction(target)) {
    targetElement = target();
  } else if ('current' in target) {
    targetElement = target.current;
  } else {
    targetElement = target;
  }
  return targetElement;
}

var getScrollTop = function getScrollTop(el) {
  if (el === document || el === document.body) {
    return Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop);
  }
  return el.scrollTop;
};
var getScrollHeight = function getScrollHeight(el) {
  return el.scrollHeight || Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
};
var getClientHeight = function getClientHeight(el) {
  return el.clientHeight || Math.max(document.documentElement.clientHeight, document.body.clientHeight);
};
export {getScrollTop, getScrollHeight, getClientHeight};
