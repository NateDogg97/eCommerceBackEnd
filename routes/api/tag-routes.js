const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint

router.get('/', (req, res) => {
  // find all tags
  // be sure to include its associated Product data
  Tag.findAll({
    include: [
      { 
        model: Product, 
        through: ProductTag, 
        as: 'products'
      },
    ], 
  })
  .then((tagData) => {
    res.status(200).json(tagData);
  });
});

router.get('/:id', (req, res) => {
  // find a single tag by its `id`
  // be sure to include its associated Product data
  Tag.findByPk(req.params.id, {
    include: [ 
      { 
        model: Product, 
        through: ProductTag, 
        as: 'products',
      }
    ]
  })
  .then((tag) => {
    if (tag === null) {
      res.status(404).json({ message: 'No tag with that ID.'})
    }
    res.status(200).json(tag);
  })
  .catch((err) => {
    res.status(500).json(err);
  });  
});

router.post('/', (req, res) => {
  // create a new tag
  Tag.create(req.body)
    .then((tag) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.productIds.length) {
        const productTagIdArr = req.body.productIds.map((product_id) => {
          return {
            tag_id: tag.id,
            product_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(tag);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

router.put('/:id', (req, res) => {
  // update a tag's name by its `id` value
  Tag.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((tag) => {
      return ProductTag.findAll({ where: { tag_id: req.params.id }});
    })
    .then((tagProducts) => {
      const tagProductIds = tagProducts.map(({ product_id }) => product_id);

      const newTagProducts = req.body.productIds
        .filter((product_id) => !tagProductIds.includes(product_id))
        .map((product_id) => {
          return {
            tag_id: req.params.id,
            product_id,
          };
        });
      
      const tagProductsToRemove = tagProducts
        .filter(({ product_id }) => !req.body.productIds.includes(product_id))
        .map(({ id }) => id);

      return Promise.all([
        ProductTag.destroy({ where: {id: tagProductsToRemove }}),
        ProductTag.bulkCreate(newTagProducts),
      ]);  
    })
      .then((updateTagProducts) => res.json(updateTagProducts))
      .catch((err) => res.status(400).json(err));
});

router.delete('/:id', (req, res) => {
  // delete on tag by its `id` value
  Tag.destroy({
    where: {
      id: req.params.id,
    },
  })
    .then((deletedtag) => {
      if (!deletedtag) {
        res.status(404).json({ message: 'No tag with that ID.'});
      }
      res.status(200).json({ message: 'Tag successfully deleted.'});
    })
    .catch((err) => {
      res.status(500).json(err);
    })  
});

module.exports = router;
