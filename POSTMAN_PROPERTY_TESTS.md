# 🚀 Postman Test Collection for Property Management API

## **Base URL**: `http://localhost:5000/api/v1`

## **Important Note**: Tenant Context Required

All property endpoints require tenant context. You have two options:

1. **Add Header**: Include `X-Tenant-Subdomain: your-tenant-subdomain` in all requests
2. **Use Subdomain**: Access the API through a tenant subdomain (e.g., `tenant.localhost:5000`)

The system will automatically resolve the tenant and set the context.

---

## **1. Authentication Setup**

### **Login to get JWT Token**
**POST** `/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "customer@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token for all subsequent requests in Authorization header:**
```
Authorization: Bearer <your-token>
```

---

## **2. Create Property**

### **Create First Property (will be set as default)**
**POST** `/properties`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Body (JSON):**
```json
{
  "name": "My Dream Home",
  "address": {
    "street": "123 Main Street",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "country": "USA"
  },
  "size": {
    "value": 2500,
    "unit": "sqft"
  },
  "propertyType": "residential",
  "features": {
    "hasFrontYard": true,
    "hasBackYard": true,
    "hasTrees": true,
    "hasGarden": false,
    "hasSprinklerSystem": true,
    "hasPool": false,
    "hasDeck": true,
    "hasPatio": true,
    "hasFence": true,
    "hasIrrigation": false
  },
  "accessInstructions": "Gate code: 1234, Key under the mat",
  "specialRequirements": "Please be careful with the rose bushes in the front yard"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id_here",
    "name": "My Dream Home",
    "address": {
      "street": "123 Main Street",
      "city": "Austin",
      "state": "TX",
      "zipCode": "78701",
      "country": "USA",
      "fullAddress": "123 Main Street, Austin, TX 78701, USA"
    },
    "size": {
      "value": 2500,
      "unit": "sqft"
    },
    "isDefault": true,
    "status": "active",
    "customer": {
      "_id": "customer_id",
      "name": "John Doe",
      "email": "customer@example.com"
    },
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "customer@example.com"
    }
  }
}
```

---

## **3. Create Second Property**

### **Create Another Property**
**POST** `/properties`

**Body (JSON):**
```json
{
  "name": "Vacation Home",
  "address": {
    "street": "456 Beach Boulevard",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101",
    "country": "USA"
  },
  "size": {
    "value": 1800,
    "unit": "sqft"
  },
  "propertyType": "residential",
  "features": {
    "hasFrontYard": false,
    "hasBackYard": true,
    "hasTrees": false,
    "hasGarden": true,
    "hasSprinklerSystem": false,
    "hasPool": true,
    "hasDeck": false,
    "hasPatio": true,
    "hasFence": false,
    "hasIrrigation": true
  },
  "accessInstructions": "Pool key in the mailbox",
  "specialRequirements": "Pool needs regular maintenance"
}
```

---

## **4. Get All Properties**

### **Get All Properties for Current Customer**
**GET** `/properties`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  },
  "data": [
    {
      "_id": "property_id_1",
      "name": "My Dream Home",
      "address": {
        "fullAddress": "123 Main Street, Austin, TX 78701, USA"
      },
      "isDefault": true,
      "status": "active"
    },
    {
      "_id": "property_id_2",
      "name": "Vacation Home",
      "address": {
        "fullAddress": "456 Beach Boulevard, Miami, FL 33101, USA"
      },
      "isDefault": false,
      "status": "active"
    }
  ]
}
```

---

## **5. Get Single Property**

### **Get Property by ID**
**GET** `/properties/{property_id}`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "My Dream Home",
    "address": {
      "street": "123 Main Street",
      "city": "Austin",
      "state": "TX",
      "zipCode": "78701",
      "country": "USA",
      "fullAddress": "123 Main Street, Austin, TX 78701, USA"
    },
    "size": {
      "value": 2500,
      "unit": "sqft"
    },
    "propertyType": "residential",
    "features": {
      "hasFrontYard": true,
      "hasBackYard": true,
      "hasTrees": true,
      "hasGarden": false,
      "hasSprinklerSystem": true,
      "hasPool": false,
      "hasDeck": true,
      "hasPatio": true,
      "hasFence": true,
      "hasIrrigation": false
    },
    "accessInstructions": "Gate code: 1234, Key under the mat",
    "specialRequirements": "Please be careful with the rose bushes in the front yard",
    "status": "active",
    "isDefault": true,
    "images": [],
    "customer": {
      "_id": "customer_id",
      "name": "John Doe",
      "email": "customer@example.com"
    }
  }
}
```

---

## **6. Get Default Property**

### **Get Customer's Default Property**
**GET** `/properties/default`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "My Dream Home",
    "isDefault": true,
    "address": {
      "fullAddress": "123 Main Street, Austin, TX 78701, USA"
    }
  }
}
```

---

## **7. Update Property**

### **Update Property Details**
**PUT** `/properties/{property_id}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Body (JSON):**
```json
{
  "name": "Updated Dream Home",
  "address": {
    "street": "123 Main Street",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78702"
  },
  "features": {
    "hasGarden": true,
    "hasPool": true
  },
  "accessInstructions": "New gate code: 5678"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "Updated Dream Home",
    "address": {
      "street": "123 Main Street",
      "city": "Austin",
      "state": "TX",
      "zipCode": "78702",
      "country": "USA",
      "fullAddress": "123 Main Street, Austin, TX 78702, USA"
    },
    "features": {
      "hasGarden": true,
      "hasPool": true
    },
    "accessInstructions": "New gate code: 5678"
  }
}
```

---

## **8. Upload Property Images**

### **Upload Multiple Images**
**POST** `/properties/{property_id}/images`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Body (Form-data):**
```
images: [file1.jpg]
images: [file2.jpg]
images: [file3.jpg]
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/your-cloud/image/upload/v123/property1.jpg",
        "publicId": "property1",
        "caption": "",
        "isPrimary": true,
        "uploadedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "url": "https://res.cloudinary.com/your-cloud/image/upload/v123/property2.jpg",
        "publicId": "property2",
        "caption": "",
        "isPrimary": false,
        "uploadedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## **9. Update Image Caption**

### **Update Image Caption**
**PUT** `/properties/{property_id}/images/{image_id}/caption`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Body (JSON):**
```json
{
  "caption": "Beautiful front yard with rose bushes"
}
```

---

## **10. Set Image as Primary**

### **Set Image as Primary**
**PUT** `/properties/{property_id}/images/{image_id}/primary`

**Headers:**
```
Authorization: Bearer <your-token>
```

---

## **11. Delete Property Image**

### **Delete Specific Image**
**DELETE** `/properties/{property_id}/images/{image_id}`

**Headers:**
```
Authorization: Bearer <your-token>
```

---

## **12. Set Property as Default**

### **Set Property as Default**
**PUT** `/properties/{property_id}/default`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Property set as default successfully"
  }
}
```

---

## **13. Delete Property**

### **Delete Property**
**DELETE** `/properties/{property_id}`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {}
}
```

---

## **14. Error Test Cases**

### **Test Invalid Property Creation**
**POST** `/properties`

**Body (JSON) - Missing Required Fields:**
```json
{
  "name": "Test Property"
}
```

**Expected Error Response:**
```json
{
  "success": false,
  "error": "Please add street address"
}
```

### **Test Unauthorized Access**
**GET** `/properties/{other_user_property_id}`

**Expected Error Response:**
```json
{
  "success": false,
  "error": "Not authorized to access this property"
}
```

---

## **15. Search and Filter Tests**

### **Get Properties with Filters**
**GET** `/properties?propertyType=residential&hasPool=true&city=Austin`

### **Get Properties with Pagination**
**GET** `/properties?page=1&limit=5`

### **Get Properties with Sorting**
**GET** `/properties?sort=createdAt&order=desc`

---

## **Environment Variables for Postman**

Create a Postman environment with these variables:

```
base_url: http://localhost:5000/api/v1
auth_token: <your-jwt-token>
property_id: <property-id-from-create-response>
image_id: <image-id-from-upload-response>
```

---

## **Collection Import**

You can import this as a Postman collection by creating a JSON file with the above requests and importing it into Postman.

**Note:** Replace all placeholder values like `{property_id}`, `{your-token}`, etc. with actual values from your responses.
