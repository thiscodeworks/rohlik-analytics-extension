function injectElements() {
    const container = document.createElement('div');
    container.id = 'rohlik-analytics-container';
    container.style.cssText = `
      margin-bottom: 20px;
    `;
  
    const button = document.createElement('button');
    button.textContent = 'Vygnerovat analýzu účtu';
    button.style.cssText = `margin: 0 0 10px 15px;`;
    
    button.addEventListener('click', generateAnalytics);
  
    const analyticsBox = document.createElement('div');
    analyticsBox.id = 'rohlik-analytics';
    analyticsBox.style.cssText = `
      background-color: white;
      padding: 15px;
      margin: 0 15px 0 15px;
      width: calc(100% - 15px);
      display: none;
    `;
  
    container.appendChild(button);
    container.appendChild(analyticsBox);
  
    const finishedOrders = document.getElementById('finishedOrders');
    if (finishedOrders) {
      finishedOrders.parentNode.insertBefore(container, finishedOrders);
    }
  }
  
  function formatCurrency(amount) {
    return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
  }

  async function fetchOrderDetails(orderId) {
    const response = await fetch(`https://www.rohlik.cz/api/v3/orders/${orderId}`);
    return await response.json();
  }

  function createStatBox(title, value) {
    return `
      <div class="stat-box">
        <h3>${title}</h3>
        <p class="stat-value">${value}</p>
      </div>
    `;
  }

  function createProductGrid(title, products) {
    return `
      <div class="product-grid">
        <h3>${title}</h3>
        <div class="product-container">
          ${products.map(item => `
            <div class="product-box">
              <img src="${item.image}" alt="${item.name}" width="100" height="100">
              <h4>${item.name}</h4>
              <p>Množství: ${item.amount}x</p>
              <p>Celkem: ${formatCurrency(item.totalPrice)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function generateAnalytics() {
    const analyticsBox = document.getElementById('rohlik-analytics');
    analyticsBox.style.display = 'block';
    analyticsBox.innerHTML = '<p>Načítání dat analýzy...</p>';

    try {
      const response = await fetch('https://www.rohlik.cz/api/v3/orders/delivered?offset=0&limit=1000');
      const data = await response.json();

      let totalAmount = 0;
      let totalItems = 0;
      let totalCourierTip = 0;
      let totalCreditsUsed = 0;
      let totalDelivery = 0;
      let deliveredOrdersCount = 0;
      let itemsMap = new Map();

      for (const order of data) {
        const orderDetails = await fetchOrderDetails(order.id);
        
        if (orderDetails.state === 'DELIVERED') {
          totalAmount += order.priceComposition.total.amount;
          totalItems += order.itemsCount;
          totalCourierTip += orderDetails.priceComposition.courierTip?.amount || 0;
          totalCreditsUsed += orderDetails.priceComposition.creditsUsed?.amount || 0;
          totalDelivery += orderDetails.priceComposition.delivery?.amount || 0;
          deliveredOrdersCount++;

          orderDetails.items.forEach(item => {
            if (itemsMap.has(item.id)) {
              let existingItem = itemsMap.get(item.id);
              existingItem.amount += item.amount;
              existingItem.totalPrice += item.priceComposition.total.amount;
            } else {
              itemsMap.set(item.id, {
                id: item.id,
                name: item.name,
                amount: item.amount,
                totalPrice: item.priceComposition.total.amount,
                image: item.images[0]
              });
            }
          });
        }
      }

      const sortedItems = Array.from(itemsMap.values());
      const mostOrdered = sortedItems.sort((a, b) => b.amount - a.amount).slice(0, 6);
      const mostExpensive = sortedItems.sort((a, b) => b.totalPrice - a.totalPrice).slice(0, 6);

      const averageOrderValue = totalAmount / deliveredOrdersCount;
      const averageItemsPerOrder = totalItems / deliveredOrdersCount;

      const style = `
        <style>
          #rohlik-analytics {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 10px;
          }
          .stat-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .stat-box {
            background-color: white;
            border-radius: 5px;
            padding: 15px;
            width: calc(33% - 10px);
            margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .stat-box h3 {
            margin: 0;
            font-size: 14px;
            color: #666;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0 0;
            color: #00a651;
          }
          .product-grid {
            background-color: white;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .product-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .product-box {
            width: calc(33% - 10px);
            margin-bottom: 20px;
            text-align: center;
          }
          .product-box img {
            object-fit: cover;
            border-radius: 5px;
            margin-bottom: 10px;
          }
          .product-box h4 {
            margin: 0 0 5px;
            font-size: 16px;
          }
          .product-box p {
            margin: 0;
            font-size: 14px;
            color: #666;
          }
        </style>
      `;

      analyticsBox.innerHTML = `
        ${style}
        <h2>Vaše analýza Rohlíku</h2>
        <div class="stat-container">
          ${createStatBox('Počet doručených objednávek', deliveredOrdersCount)}
          ${createStatBox('Celková částka utracená', formatCurrency(totalAmount))}
          ${createStatBox('Průměrná hodnota objednávky', formatCurrency(averageOrderValue))}
          ${createStatBox('Průměrný počet položek na objednávku', averageItemsPerOrder.toFixed(2))}
          ${createStatBox('Celkové spropitné kurýrům', formatCurrency(totalCourierTip))}
          ${createStatBox('Celkově použité kredity', formatCurrency(totalCreditsUsed))}
          ${createStatBox('Celková cena za doručení', formatCurrency(totalDelivery))}
        </div>
        
        ${createProductGrid('6 nejčastěji objednávaných položek', mostOrdered)}
        ${createProductGrid('6 nejdražších položek', mostExpensive)}
      `;
    } catch (error) {
      analyticsBox.innerHTML = '<p>Chyba při načítání dat analýzy. Prosím zkuste to znovu.</p>';
      console.error('Chyba při načítání dat:', error);
    }
  }
  
  injectElements();
