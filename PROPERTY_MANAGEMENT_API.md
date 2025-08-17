# Property Management API Documentation

This document provides comprehensive information about the Property Management API for the Landscaping Service Management System.

## Overview

The Property Management API allows customers to manage their properties, including adding multiple properties, uploading images, and setting default properties. The system supports full CRUD operations with proper authorization and image management.

## Base URL

```
/api/v1/properties
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Property Model Structure

```javascript
{
  _id: ObjectId,
  tenants: [ObjectId], // Array of tenant IDs
  customer: ObjectId,   // Reference to Customer
  user: ObjectId,       // Reference to User
  name: String,         // Property name (required)
  address: {
    street: String,     // Required
    city: String,       // Required
    state: String,      // Required
    zipCode: String,    // Required
    country: String,    // Default: 'USA'
    fullAddress: String // Auto-generated
  },
  size: {
    value: Number,      // Required
    unit: String        // 'sqft', 'acres', 'sqm' (default: 'sqft')
  },
  propertyType: String, // 'residential', 'commercial', 'industrial', 'agricultural'
  images: [{
    url: String,        // Cloudinary URL
    publicId: String,   // Cloudinary public ID
    caption: String,    // Optional caption
    isPrimary: Boolean, // Whether this is the primary image
    uploadedAt: Date    // Upload timestamp
  }],
  features: {
    hasFrontYard: Boolean,
    hasBackYard: Boolean,
    hasTrees: Boolean,
    hasGarden: Boolean,
    hasSprinklerSystem: Boolean,
    hasPool: Boolean,
    hasDeck: Boolean,
    hasPatio: Boolean,
    hasFence: Boolean,
    hasIrrigation: Boolean
  },
  accessInstructions: String,  // Max 500 characters
  specialRequirements: String, // Max 1000 characters
  status: String,              // 'active', 'inactive', 'maintenance'
  isDefault: Boolean,          // Whether this is the default property
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Get All Properties

**GET** `/api/v1/properties`

Returns all properties for the authenticated user.

**Authorization:** Customer, TenantAdmin

**Query Parameters:**
- `page` - Page number for pagination
- `limit` - Number of items per page
- `sort` - Sort field (e.g., `createdAt`, `name`)
- `select` - Fields to select (e.g., `name,address`)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "property_id",
      "name": "My House",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345",
        "country": "USA",
        "fullAddress": "123 Main St, Anytown, CA 12345, USA"
      },
      "size": {
        "value": 5000,
        "unit": "sqft"
      },
      "images": [...],
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get Single Property

**GET** `/api/v1/properties/:id`

Returns a specific property by ID.

**Authorization:** Customer, TenantAdmin

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "My House",
    "address": {...},
    "size": {...},
    "images": [...],
    "features": {...},
    "customer": {
      "_id": "customer_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

### 3. Create Property

**POST** `/api/v1/properties`

Creates a new property for the authenticated customer.

**Authorization:** Customer

**Request Body:**
```json
{
  "name": "My New Property",
  "address": {
    "street": "456 Oak Ave",
    "city": "Somewhere",
    "state": "NY",
    "zipCode": "67890",
    "country": "USA"
  },
  "size": {
    "value": 7500,
    "unit": "sqft"
  },
  "propertyType": "residential",
  "features": {
    "hasFrontYard": true,
    "hasBackYard": true,
    "hasTrees": false,
    "hasGarden": true,
    "hasSprinklerSystem": false
  },
  "accessInstructions": "Gate code: 1234",
  "specialRequirements": "Please be quiet during service"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_property_id",
    "name": "My New Property",
    "address": {...},
    "isDefault": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Property

**PUT** `/api/v1/properties/:id`

Updates an existing property.

**Authorization:** Customer, TenantAdmin

**Request Body:** Same as create, but all fields are optional.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "Updated Property Name",
    "address": {...},
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Delete Property

**DELETE** `/api/v1/properties/:id`

Deletes a property and all associated images.

**Authorization:** Customer, TenantAdmin

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

### 6. Upload Property Images

**POST** `/api/v1/properties/:id/images`

Uploads one or more images for a property.

**Authorization:** Customer, TenantAdmin

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images` - Image files (max 10 files, 10MB each)
- `caption` - Optional caption for all images

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "properties/property_id/image_name",
      "caption": "Front yard view",
      "isPrimary": true,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 7. Delete Property Image

**DELETE** `/api/v1/properties/:id/images/:publicId`

Deletes a specific image from a property.

**Authorization:** Customer, TenantAdmin

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

### 8. Set Property as Default

**PUT** `/api/v1/properties/:id/set-default`

Sets a property as the default property for the customer.

**Authorization:** Customer

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "My House",
    "isDefault": true
  }
}
```

### 9. Get Default Property

**GET** `/api/v1/properties/default`

Gets the default property for the authenticated customer.

**Authorization:** Customer

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "property_id",
    "name": "My Default Property",
    "isDefault": true
  }
}
```

### 10. Update Image Caption

**PUT** `/api/v1/properties/:id/images/:publicId/caption`

Updates the caption for a specific image.

**Authorization:** Customer, TenantAdmin

**Request Body:**
```json
{
  "caption": "Updated image caption"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "properties/property_id/image_name",
    "caption": "Updated image caption",
    "isPrimary": true
  }
}
```

### 11. Set Image as Primary

**PUT** `/api/v1/properties/:id/images/:publicId/set-primary`

Sets a specific image as the primary image for the property.

**Authorization:** Customer, TenantAdmin

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "properties/property_id/image_name",
      "isPrimary": true
    }
  ]
}
```

### 12. Get Properties by Customer (Admin Only)

**GET** `/api/v1/properties/customer/:customerId`

Gets all properties for a specific customer (admin only).

**Authorization:** TenantAdmin

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "property_id",
      "name": "Customer's Property",
      "customer": {
        "_id": "customer_id",
        "user": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Please add a property name"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Not authorized to access this property"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Property not found with id of property_id"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error uploading image to cloudinary"
}
```

## Usage Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';
const token = 'your-jwt-token';

// Create a new property
const createProperty = async () => {
  try {
    const response = await axios.post(`${API_BASE}/properties`, {
      name: 'My New House',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      },
      size: {
        value: 5000,
        unit: 'sqft'
      },
      features: {
        hasFrontYard: true,
        hasBackYard: true,
        hasGarden: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Property created:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

// Upload images
const uploadImages = async (propertyId) => {
  const formData = new FormData();
  formData.append('images', file1);
  formData.append('images', file2);
  formData.append('caption', 'Property photos');
  
  try {
    const response = await axios.post(`${API_BASE}/properties/${propertyId}/images`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Images uploaded:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};
```

### cURL Examples

```bash
# Get all properties
curl -X GET "http://localhost:5000/api/v1/properties" \
  -H "Authorization: Bearer your-token"

# Create property
curl -X POST "http://localhost:5000/api/v1/properties" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Property",
    "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345"
    },
    "size": {
      "value": 5000,
      "unit": "sqft"
    }
  }'

# Upload images
curl -X POST "http://localhost:5000/api/v1/properties/property_id/images" \
  -H "Authorization: Bearer your-token" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "caption=Property photos"
```

## Features

1. **Multi-tenant Support**: Properties are scoped to specific tenants
2. **Image Management**: Full CRUD operations for property images with Cloudinary integration
3. **Default Property**: Customers can set a default property
4. **Authorization**: Proper role-based access control
5. **Validation**: Comprehensive input validation and error handling
6. **Pagination**: Support for paginated results
7. **Search & Filter**: Advanced query capabilities
8. **File Upload**: Secure file upload with size and type validation

## Notes

- The first property created for a customer is automatically set as default
- Images are automatically optimized and resized when uploaded to Cloudinary
- Deleting a property also deletes all associated images from Cloudinary
- Property addresses are automatically formatted into a full address string
- All timestamps are in ISO 8601 format

