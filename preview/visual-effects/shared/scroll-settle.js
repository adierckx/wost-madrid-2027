function journeyEnd(){const journey=document.querySelector('.journey');return journey.offsetTop+journey.offsetHeight-document.querySelector('.stage').offsetHeight}
function goToJourneyEnd(){window.scrollTo({top:journeyEnd(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
// Gently finish a downward approach. Never block wheel/touch input or pull upward scrolling back.
let snapTimer,lastScroll=window.scrollY;
window.addEventListener('scroll',()=>{const y=window.scrollY,down=y>lastScroll;lastScroll=y;clearTimeout(snapTimer);const end=journeyEnd();if(down&&y>end*.70&&y<end-2&&!document.body.classList.contains('panel-open')){snapTimer=setTimeout(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.body.classList.contains('panel-open'))goToJourneyEnd()},180)}},{passive:true});
window.addEventListener('wheel',e=>{if(e.deltaY<0)clearTimeout(snapTimer)},{passive:true});
window.addEventListener('keydown',e=>{if(['ArrowUp','PageUp','Home'].includes(e.key))clearTimeout(snapTimer)});
