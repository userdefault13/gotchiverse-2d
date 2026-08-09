export function addStyles(svg, newStyles) {
  // Add styles to SVG
  const stylesMatch = svg.match(/<style>(.*?)<\/style>/g);

  if (stylesMatch === null) return '';
  const styles = stylesMatch[0];

  const stylesNoTags = styles.replace('<style>', '').replace('</style>', '').concat(newStyles);

  const finalStyle = `<style>${stylesNoTags}</style>`;
  const finalSVG = svg.replace(styles, finalStyle);

  return finalSVG;
}

export function replaceParts(svg, targetClass, replaceSvg) {
  const doc = document.createDocumentFragment();
  const wrapper = document.createElement('svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('viewbox', '0 0 64 64');
  wrapper.innerHTML = svg;
  doc.appendChild(wrapper);

  const textnodes = doc.querySelectorAll(targetClass);

  textnodes.forEach(function (txt) {
    const el = document.createElement('g');
    el.innerHTML = replaceSvg;
    txt.parentNode.replaceChild(el, txt);
  });

  const div = document.createElement('svg');
  div.appendChild(doc);
  return div.innerHTML;
}

export const removeBackground = `
.gotchi-bg, .gotchi-bg-rh, .wearable-bg {
    display:none !important;
  }
`;

export const removeShadow = `
.gotchi-shadow{
    display:none;
  }
`;

export const removeLeftHandWearables = `
.wearable-hand-left {
    display:none;
  }
`;

export const removeRightHandWearables = `
.wearable-hand-right {
    display:none;
  }
`;

export const raiseHands = `

  .gotchi-handsDownClosed {
    display:none;
  }

  .gotchi-handsDownOpen {
    display:none;
  }

  .gotchi-handsUp {
    display:block;
  }

  .gotchi-sleeves {
    display:none;
  }

  .gotchi-sleeves-up {
    display:block;
  }
`;

export const basicUpDown = (handsRaised: boolean) => `

svg {
  animation-name:down;
  animation-duration:0.5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-timing-function: steps(1);
}

.gotchi-shadow {
  animation: up 0.5s infinite linear steps(2);
   animation-name:up;
   animation-duration:0.5s;
   animation-iteration-count: infinite;
   animation-timing-function: linear;
   animation-timing-function: steps(2);
}

.gotchi-wearable {
  animation-name:down;
  animation-duration:0.5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-timing-function: steps(1);
}



.gotchi-handsDownClosed, .gotchi-handsUp, .gotchi-handsDownOpen, .gotchi-handsDownClosed, .gotchi-body, .gotchi-eyeColor, .gotchi-collateral, .gotchi-cheek, .gotchi-primary-mouth, .gotchi-wearable, .gotchi-sleeves   {
   animation-name:down;
   animation-duration:0.5s;
   animation-iteration-count: infinite;
   animation-timing-function: linear;
   animation-timing-function: steps(2);
}

.wearable-hand {
  animation-name:${handsRaised ? 'downHands' : 'down'} !important;
  animation-duration:0.5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-timing-function: steps(2);
}

@keyframes downHands {
  from {
    transform: translate(0px, -4px);
  }
 to {
    transform: translate(0px, -3px);
  }
}


@keyframes up {
  from {
    transform: translate(0px, 0);
  }
 to {
    transform: translate(0px, -1px);
  }
}


@keyframes down {
 from {
   transform: translate(0px, 0);
    }
 to {
      transform: translate(0px, 1px);
    }
}
`;

export const neutralMouth = `<g class="gotchi-primary-mouth">
<path d="M33 34h-4v2h6v-2h-1z" />
</g>`;
