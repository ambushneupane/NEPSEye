const API_URL = 'https://www.onlinekhabar.com/smtm/home/indices-data/nepse/1d'
const TURNOVER_URL='https://www.onlinekhabar.com/smtm/home/advance-decline/nepse';
const app=document.querySelector('.app');

const indexEl=document.getElementById('index');
const turnoverEl=document.getElementById('turnover');
const changeEl = document.getElementById('change');

const tabs= document.querySelectorAll('.tab');
const contents=document.querySelectorAll('.content')

const addStockModal=document.getElementById('addStockModal')
const addStockBtn = document.getElementById('addStockBtn');
const cancelAddStock = document.getElementById('cancelAddStock');

const holdingsList = document.getElementById('holdingsList');
const emptyHoldings = document.getElementById('emptyHoldings');

const confirmAddStock = document.getElementById('confirmAddStock');
const stockSymbolInput = document.getElementById('stockSymbolInput');
const stockBuyPriceInput = document.getElementById('stockBuyPriceInput');
const stockUnitsInput = document.getElementById('stockUnitsInput');

const stockError = document.getElementById('stockError');


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

async function fetchStockData(symbol){
  const url=`https://www.onlinekhabar.com/smtm/ticker-page/ticker-stats/${symbol}`;
  const res=await fetch(url);
  if(!res.ok) throw new Error('LTP fetching Failed, Check the network');
  const data= await res.json();
  const r= data.response;

  return {
    ltp:r.ltp,
    point_change:r.point_change
  }
}

async function init(){
  await loadHoldings()
  renderHoldings();
  const tasks=[loadIndex(),loadTurnover()];
  const results= await Promise.allSettled(tasks);
  results.forEach((r,i)=>{
    if(r.status==='rejected'){
      console.warn(`Task ${i} FAILED:-`,r.reason)
    }
  })
}

init();


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

let holdings = [];
let editingIndex=null;

// Open modal
addStockBtn.addEventListener('click', () => {
  addStockModal.classList.remove('hidden');
});

// Close modal (Cancel button)
cancelAddStock.addEventListener('click', () => {
  addStockModal.classList.add('hidden');
  stockError.classList.add('hidden');
});

confirmAddStock.addEventListener('click', async () => {
  clearStockError();


  const symbol = stockSymbolInput.value.trim().toUpperCase();
  const buyPrice = Number(stockBuyPriceInput.value);
  const units = Number(stockUnitsInput.value);

   if (!symbol || buyPrice <= 0 || units <= 0) {
    showStockError('Please enter valid stock details');
    return;
  }

  //Editing current Stock

  if(editingIndex!==null){
    try{
      await fetchStockData(symbol);
      holdings[editingIndex]={
        symbol,
        buyPrice,
        units
      }
      await saveHoldings();
    renderHoldings();

    editingIndex = null;
    addStockModal.classList.add('hidden');
    return;
    }catch(err){
      showStockError('Invalid stock symbol. Try again.');
      return;

    }
    
  }

  const existingHolding= holdings.find(stock=>stock.symbol.trim().toUpperCase()===symbol);
  if (existingHolding){
    // console.log(existingHolding);

    const oldBuy=existingHolding.buyPrice;
    const oldUnits= existingHolding.units;

    const totalUnits= oldUnits+units;
    console.log(totalUnits);
    const totalAmount= oldUnits*oldBuy+units*buyPrice;
    const avgBuyPrice=totalAmount/totalUnits;

    existingHolding.units=totalUnits;
    existingHolding.buyPrice= avgBuyPrice;
    await saveHoldings();
    renderHoldings();
    addStockModal.classList.add('hidden');
    return;
  }

  try{
    await fetchStockData(symbol);
  holdings.push({ symbol, buyPrice, units });

  await saveHoldings();
  renderHoldings();
  addStockModal.classList.add('hidden');
  }catch(err){
    showStockError('Invalid stock symbol.Try Again :).');
    console.error(err);
  }

  
  
});

async function saveHoldings() {
  await browser.storage.local.set({ holdings });
}

async function loadHoldings() {
  const data = await browser.storage.local.get('holdings');
  // console.log(data);
  holdings = data.holdings || [];
}


async function renderHoldings(){
  holdingsList.innerHTML='';

  if(holdings.length===0){
    //if No holding,
    emptyHoldings.classList.remove('hidden');
    holdingsList.appendChild(emptyHoldings);
    return;
  }
  emptyHoldings.classList.add('hidden');

  for(let index=0; index<holdings.length;index++){
    const stock= holdings[index];
    const card= document.createElement('div');
    card.className='holding-card';

    card.innerHTML=`
    <div class="holding-header">
        <span class="holding-symbol">${stock.symbol}</span>

        <div class="holding-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>

      <div class="holding-body">
        <div class="holding-row">
          <span class="holding-label">LTP</span>
          <span class="holding-number ltp">--</span>
        </div>

        <div class="holding-row">
          <span class="holding-label">Buy</span>
          <span class="holding-number">Rs ${stock.buyPrice.toFixed(2)}</span>
        </div>

        <div class="holding-row">
          <span class="holding-label">Units</span>
          <span class="holding-number">${stock.units}</span>
        </div>

        <div class="holding-row">
          <span class="holding-label">Daily P&L</span>
          <span class="holding-number daily-pnl">--</span>
        </div>

        <div class="holding-pnl">--</div>
      </div>
    `;

    holdingsList.append(card);

  stockSymbolInput.value = '';
  stockBuyPriceInput.value = '';
  stockUnitsInput.value = '';

    //Delete Functionality
    const deleteBtn=card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click',async()=>{
      holdings.splice(index,1);
      await saveHoldings();
      renderHoldings();
    })


    //Edit functionality

  const editBtn=card.querySelector('.edit-btn');

  editBtn.addEventListener('click',()=>{
    editingIndex = index;
    const stock=holdings[index];
    stockSymbolInput.value=stock.symbol;
    stockBuyPriceInput.value=stock.buyPrice.toFixed(2);// make it toFixed on user input...
    stockUnitsInput.value=stock.units.toFixed(2);
    addStockModal.classList.remove('hidden');

  })

    //Fetching LTP and Calculation of PnL
    const ltpEl= card.querySelector('.ltp');
    const pnlEl=card.querySelector('.holding-pnl');
    const dailyPnlEl= card.querySelector('.daily-pnl');



    try{
      const data=await fetchStockData(stock.symbol);  
      const pnl= (data.ltp-stock.buyPrice)*stock.units;      
      const pnlPercent= ((data.ltp-stock.buyPrice)/stock.buyPrice)*100;      
      const dailyPnL=(data.point_change)*stock.units;

      ltpEl.textContent= `Rs ${data.ltp.toFixed(2)}`;
      dailyPnlEl.textContent=`Rs ${dailyPnL.toFixed(2)}`;
      pnlEl.textContent= `Rs ${pnl.toFixed(2)}(${pnlPercent.toFixed(2)}%)`;

      pnlEl.classList.add(pnl >= 0 ? 'positive' : 'negative');
      card.classList.add(pnl >= 0 ? 'profit' : 'loss');

    }catch(err){
      console.error('Ltp fetching failed',err);
      ltpEl.textContent = 'N/A';
      pnlEl.textContent = 'N/A';
    }
  }

}


















let errorTimeout;

function showStockError(message) {
  stockError.textContent = message;
  stockError.classList.remove('hidden');

  app.classList.add('dimmed');

  // clears  previous timeout 
  clearTimeout(errorTimeout);

  // restore after 1.5 seconds
  errorTimeout = setTimeout(() => {
    clearStockError();
  }, 1500);
  stockSymbolInput.value = '';
  stockBuyPriceInput.value = '';
  stockUnitsInput.value = '';

}

function clearStockError() {
  stockError.textContent = '';
  stockError.classList.add('hidden');
  app.classList.remove('dimmed');
}
