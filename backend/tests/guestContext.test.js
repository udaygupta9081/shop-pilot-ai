import { test } from "node:test"
import assert from "node:assert/strict"
import mongoose from "mongoose"
import Message, { ASSISTANT_SENDER } from "../Model/messageModel.js"
import { sanitizeGuestContext } from "../services/chatService.js"

test("guest context accepts only bounded messages and valid product references", () => {
    const id = new mongoose.Types.ObjectId().toString()
    const context = sanitizeGuestContext({
        summary: "x".repeat(900),
        recent_messages: [
            { role: "user", content: "first" },
            { role: "system", content: "not forwarded" },
            ...Array.from({ length: 6 }, (_, index) => ({ role: "assistant", content: `${index}-${"y".repeat(700)}` }))
        ],
        referenced_products: [
            { product_id: id, position: 1, kind: "recommended", title: "x".repeat(140) },
            { product_id: "not-an-id", position: 2, kind: "recommended" }
        ]
    })

    assert.equal(context.summary.length, 500)
    assert.equal(context.recent_messages.length, 5)
    assert.ok(context.recent_messages.every((message) => message.content.length <= 600))
    assert.deepEqual(context.referenced_products.map((product) => product.product_id), [id])
    assert.equal(context.referenced_products[0].title.length, 100)
})

test("assistant product metadata remains typed for authenticated chat history", () => {
    const productId = new mongoose.Types.ObjectId()
    const message = Message.hydrate({
        sender: ASSISTANT_SENDER,
        message: "Recommended product",
        metadata: {
            products: [{
                productId,
                asin: "B0TEST0001",
                title: "Test product",
                imgUrl: "https://example.com/image.jpg",
                productURL: "https://example.com/product",
                price: 125,
                stars: 4.5,
                reviews: 100
            }]
        }
    }).toObject()

    assert.equal(message.metadata.products[0].productId.toString(), productId.toString())
    assert.equal(message.metadata.products[0].asin, "B0TEST0001")
    assert.equal(message.metadata.products[0].reviews, 100)
})
