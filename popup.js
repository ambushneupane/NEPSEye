const {API_URL,TURNOVER_URL}=browser.runtime.getManifest().my_config;

const indexEl=document.getElementById('index');
const turnoverEl=document.getElementById('turnover');
const changeEl = document.getElementById('change');




async function fetchJson(url){
  const res= await fetch(url);
  if(!res.ok) throw new Error(res.status);
  return res.json();
}



async function loadIndex(){
  try{
  const data= await fetchJson(API_URL);
  indexEl.textContent=data.response.latest_price;
  const sign= data.response.point_change>=0? '↑':'↓';
  changeEl.textContent=`${sign}${data.response.point_change} (${data.response.percentage_change.toFixed(2)}%)`

  if(data.response.point_change>=0){
    console.log()
    changeEl.classList.add('positive');
    changeEl.classList.remove('negative');
  }else{
    changeEl.classList.add('negative');
    changeEl.classList.remove('positive');
  }
}catch(err){
  console.error('Index fetched failed',err);
  indexEl.textContent='_';
  changeEl.textContent='_';
}
}

async function loadTurnover(){
  const data= await fetchJson(TURNOVER_URL);
  turnoverEl.textContent=`${Math.floor(data.response[0].turnover).toLocaleString('en-US')}`
}

async function init(){
  const tasks=[loadIndex(),loadTurnover()];
  const results= await Promise.allSettled(tasks);
  results.forEach((r,i)=>{
    if(r.status==='rejected'){
      console.warn(`Task ${i} FAILED:-`,r.reason)
    }
  })
}

init();



const tabs= document.querySelectorAll('.tab');
const contents=document.querySelectorAll('.content')
// console.log(tabs,contents)

function activateTab(tabName){
  
  //Removing active from all tabs
  tabs.forEach(tab=>tab.classList.remove('active'));
  contents.forEach(c=>c.classList.remove('active'));
  

  document.querySelector(`.tab[data-tab=${tabName}]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');

}
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    activateTab(tabName);
  });
});

// Default tab
activateTab('holdings');